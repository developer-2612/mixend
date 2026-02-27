import fs from 'fs/promises';
import path from 'path';
import { requireAuth } from '../../../../lib/auth-server';
import { consumeRateLimit, getRateLimitHeaders } from '../../../../lib/rate-limit';

export const runtime = 'nodejs';

const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const getSafeFolder = (value) => String(value || '').replace(/\D/g, '');

const detectImageExt = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  const isJpeg =
    buffer.length > 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;
  if (isJpeg) return 'jpg';

  const isPng =
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  if (isPng) return 'png';

  const isWebp =
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP';
  if (isWebp) return 'webp';

  return null;
};

const removeExistingProfiles = async (folderPath, keepExt) => {
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];
  await Promise.all(
    extensions.map(async (ext) => {
      if (ext === keepExt) return;
      const filePath = path.join(folderPath, `profile.${ext}`);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore if missing
      }
    })
  );
};

export async function POST(request) {
  try {
    const user = await requireAuth();
    const uploadLimit = consumeRateLimit({
      storeKey: 'profile-photo-upload',
      key: String(user.id),
      limit: 20,
      windowMs: 60 * 60 * 1000,
      blockMs: 60 * 60 * 1000,
    });
    if (!uploadLimit.allowed) {
      return Response.json(
        { success: false, error: 'Too many upload attempts. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(uploadLimit) }
      );
    }

    const formData = await request.formData();
    const file = formData.get('photo');

    if (!file || typeof file.arrayBuffer !== 'function') {
      return Response.json({ success: false, error: 'Photo file is required.' }, { status: 400 });
    }

    const fileType = file.type || '';
    const ext = ALLOWED_TYPES.get(fileType);
    if (!ext) {
      return Response.json({ success: false, error: 'Only JPG, PNG, or WEBP images are allowed.' }, { status: 400 });
    }
    if (typeof file.size === 'number' && file.size > MAX_PHOTO_BYTES) {
      return Response.json(
        { success: false, error: 'Photo is too large. Maximum size is 2MB.' },
        { status: 413 }
      );
    }

    const folderName = getSafeFolder(user.phone || user.id);
    if (!folderName) {
      return Response.json({ success: false, error: 'Unable to determine admin folder.' }, { status: 400 });
    }

    const publicDir = path.join(process.cwd(), 'public');
    const adminDir = path.join(publicDir, folderName);
    await fs.mkdir(adminDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_PHOTO_BYTES) {
      return Response.json(
        { success: false, error: 'Photo is too large. Maximum size is 2MB.' },
        { status: 413 }
      );
    }
    const detectedExt = detectImageExt(buffer);
    if (!detectedExt || detectedExt !== ext) {
      return Response.json(
        { success: false, error: 'Invalid image file. Please upload a valid JPG, PNG, or WEBP photo.' },
        { status: 400 }
      );
    }

    const filename = `profile.${ext}`;
    const filePath = path.join(adminDir, filename);
    await fs.writeFile(filePath, buffer);
    await removeExistingProfiles(adminDir, ext);

    return Response.json({
      success: true,
      url: `/${folderName}/${filename}?v=${Date.now()}`,
    });
  } catch (error) {
    if (error.status === 401) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Profile photo upload error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
