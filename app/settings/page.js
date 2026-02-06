'use client';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import Badge from '../components/common/Badge.jsx';
import { useAuth } from '../components/auth/AuthProvider.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faBell,
  faPalette,
  faMobileScreen,
  faGlobe,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';

const WHATSAPP_API_BASE =
  process.env.NEXT_PUBLIC_WHATSAPP_API_BASE || 'http://localhost:3001';
const WHATSAPP_SOCKET_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_SOCKET_URL || WHATSAPP_API_BASE;

export default function SettingsPage() {
  const { user, loading: authLoading, refresh } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState('idle');
  const [whatsappQr, setWhatsappQr] = useState('');
  const [whatsappActionStatus, setWhatsappActionStatus] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [passwordStatus, setPasswordStatus] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [whatsappConfig, setWhatsappConfig] = useState({
    phone: '',
    businessName: '',
    category: 'Technology',
  });

  const updatePasswordField = (field) => (event) =>
    setPasswordForm((prev) => ({ ...prev, [field]: event.target.value }));

  useEffect(() => {
    if (user) {
      setProfile((prev) => ({
        name: user.name || prev.name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
      }));
    }
  }, [user]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setProfileError('');
        const response = await fetch('/api/profile', { credentials: 'include' });
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(text || 'Unexpected server response');
        }
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load profile');
        }
        setProfile({
          name: data.data?.name || '',
          email: data.data?.email || '',
          phone: data.data?.phone || '',
        });
        if (data.data?.whatsapp_number || data.data?.whatsapp_name) {
          setWhatsappConfig((prev) => ({
            ...prev,
            phone: data.data?.whatsapp_number || prev.phone,
            businessName: data.data?.whatsapp_name || prev.businessName,
          }));
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        setProfileError(error.message);
      } finally {
        setProfileLoading(false);
      }
    };

    if (authLoading) return;
    if (!user) {
      setProfileLoading(false);
      return;
    }
    loadProfile();
  }, [authLoading, user]);

  useEffect(() => {
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`${WHATSAPP_API_BASE}/whatsapp/status`);
        if (!response.ok) {
          throw new Error('Failed to load WhatsApp status');
        }
        const payload = await response.json();
        if (!isMounted) return;
        const nextStatus = payload?.status || 'idle';
        const isCurrentAdmin =
          payload?.activeAdminId && user?.id && payload.activeAdminId === user.id;
        const derivedStatus =
          nextStatus === 'connected' && !isCurrentAdmin
            ? 'connected_other'
            : nextStatus;
        setWhatsappStatus(derivedStatus);
        setWhatsappConnected(derivedStatus === 'connected');
        if (derivedStatus === 'connected') {
          setWhatsappQr('');
        } else if (payload?.qrImage) {
          setWhatsappQr(payload.qrImage);
        }
      } catch (error) {
        if (isMounted) {
          setWhatsappActionStatus('Unable to fetch WhatsApp status.');
        }
      }
    };

    fetchStatus();

    const socket = io(WHATSAPP_SOCKET_URL);

    socket.on('whatsapp:status', (payload) => {
      const nextStatus = payload?.status || 'idle';
      const isCurrentAdmin =
        payload?.activeAdminId && user?.id && payload.activeAdminId === user.id;
      const derivedStatus =
        nextStatus === 'connected' && !isCurrentAdmin
          ? 'connected_other'
          : nextStatus;
      setWhatsappStatus(derivedStatus);
      setWhatsappConnected(derivedStatus === 'connected');
      if (derivedStatus === 'connected') {
        setWhatsappQr('');
      } else if (payload?.qrImage) {
        setWhatsappQr(payload.qrImage);
      }
    });

    socket.on('whatsapp:qr', (qrImage) => {
      if (qrImage) {
        setWhatsappQr(qrImage);
      }
    });

    socket.on('connect_error', () => {
      setWhatsappActionStatus('Unable to connect to WhatsApp service.');
    });

    return () => {
      isMounted = false;
      socket.disconnect();
    };
  }, [user?.id]);

  const handleStartWhatsApp = async () => {
    try {
      setWhatsappActionStatus('');
      const response = await fetch(`${WHATSAPP_API_BASE}/whatsapp/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user?.id }),
      });
      if (!response.ok) {
        throw new Error('Failed to start WhatsApp');
      }
    } catch (error) {
      setWhatsappActionStatus(error.message);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    try {
      setWhatsappActionStatus('');
      const response = await fetch(`${WHATSAPP_API_BASE}/whatsapp/disconnect`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to disconnect WhatsApp');
      }
    } catch (error) {
      setWhatsappActionStatus(error.message);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: faUser },
    // { id: 'notifications', name: 'Notifications', icon: faBell },
    { id: 'appearance', name: 'Appearance', icon: faPalette },
    { id: 'whatsapp', name: 'WhatsApp', icon: faMobileScreen },
    // { id: 'integrations', name: 'Integrations', icon: faGlobe },
    { id: 'security', name: 'Security', icon: faShieldHalved }
  ];

  const isWhatsappPending = whatsappStatus === 'starting' || whatsappStatus === 'qr';
  const whatsappTone = whatsappConnected ? 'green' : isWhatsappPending ? 'amber' : 'red';
  const whatsappStatusLabel = whatsappConnected
    ? 'Configured'
    : whatsappStatus === 'connected_other'
    ? 'Connected (Other Admin)'
    : whatsappStatus === 'starting'
    ? 'Starting'
    : whatsappStatus === 'qr'
    ? 'Awaiting Scan'
    : whatsappStatus === 'auth_failure'
    ? 'Auth Failed'
    : 'Disconnected';
  const whatsappStatusMessage = whatsappConnected
    ? 'WhatsApp is connected and configured for this admin.'
    : whatsappStatus === 'connected_other'
    ? 'WhatsApp is connected under a different admin account.'
    : whatsappStatus === 'starting'
    ? 'Starting WhatsApp client. Please wait...'
    : whatsappStatus === 'qr'
    ? 'Scan the QR code below with WhatsApp to connect.'
    : whatsappStatus === 'auth_failure'
    ? 'Authentication failed. Please reconnect.'
    : 'WhatsApp client is currently disconnected.';

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h1 className="text-3xl font-bold text-aa-dark-blue mb-2">Settings</h1>
        <p className="text-aa-gray">Manage your account and application preferences</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Tabs Sidebar */}
        <div className="col-span-3">
          <Card className="p-2">
            {tabs.map(tab => {
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left mb-1 ${
                    activeTab === tab.id
                      ? 'bg-aa-orange text-white'
                      : 'text-aa-gray hover:bg-gray-50'
                  }`}
                  data-testid={`settings-tab-${tab.id}`}
                >
                  <FontAwesomeIcon icon={tab.icon} style={{ fontSize: 18 }} />
                  <span className="font-semibold">{tab.name}</span>
                </button>
              );
            })}
          </Card>
        </div>

        {/* Content Area */}
        <div className="col-span-9">
          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <Card>
              <h2 className="text-2xl font-bold text-aa-dark-blue mb-6">Profile Settings</h2>
              <div className="space-y-6">
                <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
                  <div className="w-24 h-24 rounded-full bg-aa-dark-blue flex items-center justify-center overflow-hidden">
                    {profilePhotoPreview ? (
                      <img
                        src={profilePhotoPreview}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-3xl">
                        {profile.name?.charAt(0) || 'A'}
                      </span>
                    )}
                  </div>
                  <div>
                    <input
                      id="profile-photo-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        setProfilePhoto(file);
                        setProfilePhotoPreview(URL.createObjectURL(file));
                      }}
                    />
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('profile-photo-input')?.click()}
                      >
                        Change Photo
                      </Button>
                      {profilePhotoPreview && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setProfilePhoto(null);
                            setProfilePhotoPreview(null);
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-aa-gray mt-2">JPG, PNG. Max size 2MB</p>
                  </div>
                </div>

                {profileError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {profileError}
                  </div>
                )}

                {profileLoading ? (
                  <div className="p-4 bg-gray-50 rounded-lg text-aa-gray text-sm">
                    Loading profile data...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Full Name"
                      value={profile.name}
                      onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Enter your name"
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={profile.email}
                      onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="Enter your email"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Phone"
                    value={profile.phone}
                    onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="Enter phone number"
                    disabled
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="primary"
                    onClick={async () => {
                      try {
                        setSaveStatus('');
                        const response = await fetch('/api/profile', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({
                            name: profile.name,
                            email: profile.email,
                          }),
                        });
                        const contentType = response.headers.get('content-type') || '';
                        if (!contentType.includes('application/json')) {
                          const text = await response.text();
                          throw new Error(text || 'Unexpected server response');
                        }
                        const data = await response.json();
                        if (!response.ok) {
                          throw new Error(data.error || 'Failed to save');
                        }
                        setProfile({
                          name: data.data?.name || '',
                          email: data.data?.email || '',
                          phone: data.data?.phone || '',
                        });
                        await refresh();
                        setSaveStatus('Profile updated.');
                        setTimeout(() => setSaveStatus(''), 2000);
                      } catch (error) {
                        console.error('Failed to save profile:', error);
                        setSaveStatus(error.message);
                      }
                    }}
                    disabled={profileLoading}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setProfileLoading(true);
                      setProfileError('');
                      try {
                        const response = await fetch('/api/profile');
                        const data = await response.json();
                        if (!response.ok) {
                          throw new Error(data.error || 'Failed to reset');
                        }
                        setProfile({
                          name: data.data?.name || '',
                          email: data.data?.email || '',
                          phone: data.data?.phone || '',
                        });
                        setProfilePhoto(null);
                        setProfilePhotoPreview(null);
                        setSaveStatus('');
                      } catch (error) {
                        setProfileError(error.message);
                      } finally {
                        setProfileLoading(false);
                      }
                    }}
                    disabled={profileLoading}
                  >
                    Reset
                  </Button>
                  {saveStatus && (
                    <span className={`text-sm font-semibold ${saveStatus.includes('Failed') || saveStatus.includes('error') ? 'text-red-600' : 'text-green-600'}`}>
                      {saveStatus}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Notifications Settings */}
          {/* {activeTab === 'notifications' && (
            <Card>
              <h2 className="text-2xl font-bold text-aa-dark-blue mb-6">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { title: 'New Messages', description: 'Get notified when you receive new messages' },
                  { title: 'New Leads', description: 'Get notified when new leads are created' },
                  { title: 'Broadcast Sent', description: 'Get notified when broadcasts are successfully sent' },
                  { title: 'Team Updates', description: 'Get notified about team member activities' },
                  { title: 'System Updates', description: 'Get notified about system maintenance and updates' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-aa-text-dark">{item.title}</p>
                      <p className="text-sm text-aa-gray mt-1">{item.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-aa-orange"></div>
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          )} */}

          {/* Appearance Settings */}
          {activeTab === 'appearance' && (
            <Card>
              <h2 className="text-2xl font-bold text-aa-dark-blue mb-6">Appearance</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-aa-text-dark mb-3">Theme</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border-2 border-aa-orange rounded-lg cursor-pointer bg-white">
                      <div className="w-full h-24 bg-gradient-to-br from-aa-orange to-aa-dark-blue rounded-lg mb-3"></div>
                      <p className="font-semibold text-aa-text-dark">Default Theme</p>
                      <Badge variant="orange" className="mt-2">Active</Badge>
                    </div>
                    <div className="p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-aa-orange">
                      <div className="w-full h-24 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg mb-3"></div>
                      <p className="font-semibold text-aa-text-dark">Dark Theme</p>
                      <Badge variant="default" className="mt-2">Coming Soon</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-aa-text-dark mb-3">Accent Color</label>
                  <div className="flex gap-3">
                    {['#FF6B00', '#0A1F44', '#4CAF50', '#2196F3', '#9C27B0', '#F44336'].map(color => (
                      <button
                        key={color}
                        className="w-12 h-12 rounded-lg border-2 border-gray-200 hover:border-aa-dark-blue"
                        style={{ backgroundColor: color }}
                      ></button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* WhatsApp Settings */}
          {activeTab === 'whatsapp' && (
            <Card>
              <h2 className="text-2xl font-bold text-aa-dark-blue mb-6">WhatsApp Configuration</h2>
              <div className="space-y-6">
                <div
                  className={`p-6 border-2 rounded-lg ${
                    whatsappTone === 'green'
                      ? 'bg-green-50 border-green-200'
                      : whatsappTone === 'amber'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        whatsappTone === 'green'
                          ? 'bg-green-500 animate-pulse'
                          : whatsappTone === 'amber'
                          ? 'bg-amber-500 animate-pulse'
                          : 'bg-red-500'
                      }`}
                    ></div>
                    <span
                      className={`font-semibold ${
                        whatsappTone === 'green'
                          ? 'text-green-700'
                          : whatsappTone === 'amber'
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }`}
                    >
                      {whatsappStatusLabel}
                    </span>
                  </div>
                  <p
                    className={`text-sm ${
                      whatsappTone === 'green'
                        ? 'text-green-600'
                        : whatsappTone === 'amber'
                        ? 'text-amber-600'
                        : 'text-red-600'
                    }`}
                  >
                    {whatsappStatusMessage}
                  </p>
                </div>

                {!whatsappConnected && whatsappQr && (
                  <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                    <img
                      src={whatsappQr}
                      alt="WhatsApp QR Code"
                      className="w-56 h-56"
                    />
                    <p className="text-sm text-aa-gray text-center">
                      Open WhatsApp on your phone → Linked Devices → Link a device
                    </p>
                  </div>
                )}

                {whatsappActionStatus && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {whatsappActionStatus}
                  </div>
                )}

                <Input
                  label="Phone Number"
                  value={whatsappConfig.phone}
                  onChange={(event) => setWhatsappConfig((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="Not connected"
                  disabled
                />
                <Input
                  label="Business Name"
                  value={whatsappConfig.businessName}
                  onChange={(event) => setWhatsappConfig((prev) => ({ ...prev, businessName: event.target.value }))}
                  placeholder="Not connected"
                  disabled
                />
                <Input
                  label="Business Category"
                  value={whatsappConfig.category}
                  onChange={(event) => setWhatsappConfig((prev) => ({ ...prev, category: event.target.value }))}
                  disabled={!whatsappConnected}
                />

                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    onClick={handleStartWhatsApp}
                    disabled={whatsappConnected || whatsappStatus === 'starting'}
                  >
                    {whatsappConnected
                      ? 'Configured'
                      : whatsappStatus === 'starting'
                      ? 'Starting...'
                      : 'Connect WhatsApp'}
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                    onClick={handleDisconnectWhatsApp}
                    disabled={!whatsappConnected}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Integrations */}
          {/* {activeTab === 'integrations' && (
            <Card>
              <h2 className="text-2xl font-bold text-aa-dark-blue mb-6">Integrations</h2>
              <div className="space-y-4">
                {[
                  { name: 'Google Calendar', description: 'Sync your meetings and appointments', connected: true },
                  { name: 'Slack', description: 'Get notifications in your Slack workspace', connected: false },
                  { name: 'Zapier', description: 'Connect with 5000+ apps', connected: false },
                  { name: 'Google Drive', description: 'Store and share files', connected: true },
                  { name: 'Stripe', description: 'Accept payments and manage subscriptions', connected: false }
                ].map((integration, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-aa-orange">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-aa-dark-blue/10 rounded-lg flex items-center justify-center">
                        <FontAwesomeIcon icon={faGlobe} className="text-aa-dark-blue" style={{ fontSize: 24 }} />
                      </div>
                      <div>
                        <p className="font-semibold text-aa-text-dark">{integration.name}</p>
                        <p className="text-sm text-aa-gray">{integration.description}</p>
                      </div>
                    </div>
                    {integration.connected ? (
                      <Badge variant="green">Connected</Badge>
                    ) : (
                      <Button variant="outline" className="text-sm">Connect</Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )} */}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <Card>
              <h2 className="text-2xl font-bold text-aa-dark-blue mb-6">Security Settings</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-aa-text-dark mb-4">Change Password</h3>
                  <div className="space-y-4">
                    <Input
                      label="Current Password"
                      type="password"
                      placeholder="Enter current password"
                      value={passwordForm.current}
                      onChange={updatePasswordField('current')}
                      disabled={passwordLoading}
                    />
                    <Input
                      label="New Password"
                      type="password"
                      placeholder="Enter new password"
                      value={passwordForm.next}
                      onChange={updatePasswordField('next')}
                      disabled={passwordLoading}
                    />
                    <Input
                      label="Confirm Password"
                      type="password"
                      placeholder="Confirm new password"
                      value={passwordForm.confirm}
                      onChange={updatePasswordField('confirm')}
                      disabled={passwordLoading}
                    />
                    <div className="flex items-center gap-3">
                      <Button
                        variant="primary"
                        onClick={async () => {
                          setPasswordStatus('');
                          if (!passwordForm.next || passwordForm.next.length < 8) {
                            setPasswordStatus('New password must be at least 8 characters.');
                            return;
                          }
                          if (passwordForm.next !== passwordForm.confirm) {
                            setPasswordStatus('Passwords do not match.');
                            return;
                          }
                          setPasswordLoading(true);
                          try {
                            const response = await fetch('/api/profile/password', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({
                                currentPassword: passwordForm.current,
                                newPassword: passwordForm.next,
                              }),
                            });
                            const data = await response.json();
                            if (!response.ok) {
                              throw new Error(data.error || 'Failed to update password.');
                            }
                            setPasswordForm({ current: '', next: '', confirm: '' });
                            setPasswordStatus('Password updated.');
                          } catch (error) {
                            setPasswordStatus(error.message);
                          } finally {
                            setPasswordLoading(false);
                          }
                        }}
                        disabled={passwordLoading}
                      >
                        {passwordLoading ? 'Updating...' : 'Update Password'}
                      </Button>
                      {passwordStatus && (
                        <span className={`text-sm font-semibold ${passwordStatus.includes('updated') ? 'text-green-600' : 'text-red-600'}`}>
                          {passwordStatus}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-aa-text-dark mb-4">Two-Factor Authentication</h3>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-aa-text-dark">Enable 2FA</p>
                      <p className="text-sm text-aa-gray mt-1">Add an extra layer of security to your account</p>
                    </div>
                    <Button variant="outline">Enable</Button>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-aa-text-dark mb-4">Active Sessions</h3>
                  <div className="space-y-3">
                    {[
                      { device: 'Chrome on Windows', location: 'Mumbai, India', time: 'Active now' },
                      { device: 'Safari on iPhone', location: 'Delhi, India', time: '2 hours ago' }
                    ].map((session, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg">
                        <div>
                          <p className="font-semibold text-aa-text-dark">{session.device}</p>
                          <p className="text-sm text-aa-gray">{session.location} • {session.time}</p>
                        </div>
                        <Button variant="ghost" className="text-red-600">Revoke</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
