'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import Modal from '../components/common/Modal.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightToBracket, faEnvelope, faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../components/auth/AuthProvider.jsx';

export default function LoginPage() {
  const router = useRouter();
  const { refresh, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || 'Login failed');
        return;
      }

      await refresh();
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotIdentifier }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send temporary password');
      }
      setForgotOpen(false);
      setResetOpen(true);
      setTempPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setResetError('');
      setResetSuccess('');
    } catch (err) {
      setForgotError(err.message || 'Failed to send temporary password.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    if (!tempPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setResetError('All fields are required.');
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setResetError('Passwords do not match.');
      return;
    }
    setResetLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotIdentifier,
          tempPassword,
          newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }
      setResetSuccess('Password updated. You can now log in.');
      setTimeout(() => {
        setResetOpen(false);
        setTempPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setResetError('');
      }, 1500);
    } catch (err) {
      setResetError(err.message || 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="auth-v2-shell auth-v2-login relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="pointer-events-none absolute inset-0">
        <span className="auth-v2-blob auth-v2-blob-one" />
        <span className="auth-v2-blob auth-v2-blob-two" />
        <span className="auth-v2-blob auth-v2-blob-three" />
        <span className="auth-v2-blob auth-v2-blob-four" />
        <span className="auth-v2-beam auth-v2-beam-one" />
        <span className="auth-v2-beam auth-v2-beam-two" />
        <span className="auth-v2-ring auth-v2-ring-one" />
        <span className="auth-v2-ring auth-v2-ring-two" />
      </div>

      <div className="auth-v2-wrap relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <aside className="auth-v2-panel hidden rounded-[2rem] border border-white/20 bg-aa-dark-blue/90 p-8 text-white shadow-[0_26px_70px_rgba(10,31,68,0.45)] backdrop-blur lg:flex lg:flex-col lg:justify-between">
            <div>
              <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-1 text-xs font-semibold tracking-[0.24em] uppercase">
                AlgoAura CRM
              </p>
              <h2 className="mt-6 text-4xl font-black leading-tight">
                Welcome back to your WhatsApp growth hub.
              </h2>
              <p className="mt-4 text-sm text-white/80">
                Track chats, leads, orders, and appointments from one dashboard built for fast teams.
              </p>
            </div>
            <div className="space-y-3 text-sm text-white/85">
              <p className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">Real-time customer communication</p>
              <p className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">Role-based access and secure controls</p>
              <p className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">Automation + AI replies when you need speed</p>
            </div>
          </aside>

          <section className="auth-v2-card rounded-[2rem] border border-white/60 bg-white/92 p-6 shadow-[0_26px_65px_rgba(10,31,68,0.22)] backdrop-blur-sm sm:p-8 lg:p-10">
            <div className="mb-7 flex justify-center">
              <div className="auth-v2-logo-wrap">
                <span className="auth-v2-logo-backdrop" aria-hidden="true" />
                <span className="auth-v2-logo-orbit auth-v2-logo-orbit-one" aria-hidden="true" />
                <span className="auth-v2-logo-orbit auth-v2-logo-orbit-two" aria-hidden="true" />
                <div className="auth-v2-logo-core">
                  <Image
                    src="/algoaura_logo.png"
                    alt="AlgoAura"
                    width={360}
                    height={110}
                    priority
                    className="auth-v2-logo-img"
                  />
                </div>
              </div>
            </div>

            <h1 className="text-center text-3xl font-black text-aa-dark-blue">Sign in</h1>
            <p className="mt-2 text-center text-sm text-aa-gray">Access your workspace and continue managing customers.</p>

            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <Input
                label="User ID / Email / Phone"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="User ID, email, or phone"
                required
                icon={<FontAwesomeIcon icon={faEnvelope} style={{ fontSize: 18 }} />}
              />

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                icon={<FontAwesomeIcon icon={faLock} style={{ fontSize: 18 }} />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                  </button>
                }
              />

              <Button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl py-3 text-base"
                icon={<FontAwesomeIcon icon={faRightToBracket} style={{ fontSize: 18 }} />}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>

            <div className="auth-v2-divider my-6">
              <span>or</span>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl py-3 text-base"
              onClick={() => {
                window.location.href = '/api/auth/google/start';
              }}
            >
              Continue with Google
            </Button>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => {
                  setForgotOpen(true);
                  setForgotError('');
                  setForgotIdentifier(email || '');
                }}
                className="text-sm font-semibold text-aa-orange hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-aa-gray">
              New here?{' '}
              <button
                type="button"
                onClick={() => router.push('/signup')}
                className="font-semibold text-aa-orange hover:underline"
              >
                Create an account
              </button>
            </p>
          </section>
        </div>
      </div>

      <Modal
        isOpen={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Forgot Password"
        size="sm"
      >
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <p className="text-sm text-aa-gray">
            Enter your email or phone. We will send a temporary password to your email.
          </p>
          <Input
            label="Email or Phone"
            value={forgotIdentifier}
            onChange={(e) => setForgotIdentifier(e.target.value)}
            placeholder="you@example.com or phone"
            required
          />
          {forgotError && (
            <p className="text-sm text-red-600">{forgotError}</p>
          )}
          <div className="flex gap-3">
            <Button type="submit" variant="primary" className="flex-1" disabled={forgotLoading}>
              {forgotLoading ? 'Sending...' : 'Send Temporary Password'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setForgotOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset Password"
        size="sm"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <Input
            label="Temporary Password"
            type="text"
            value={tempPassword}
            onChange={(e) => setTempPassword(e.target.value)}
            placeholder="Enter the temp password from email"
            required
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
          />
          {resetError && <p className="text-sm text-red-600">{resetError}</p>}
          {resetSuccess && <p className="text-sm text-green-600">{resetSuccess}</p>}
          <div className="flex gap-3">
            <Button type="submit" variant="primary" className="flex-1" disabled={resetLoading}>
              {resetLoading ? 'Saving...' : 'Save New Password'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setResetOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
