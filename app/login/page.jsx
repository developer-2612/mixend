'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
    <div className="min-h-screen bg-gradient-to-br from-aa-dark-blue to-aa-dark-blue/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-aa-orange rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-3xl">A</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-aa-dark-blue mb-2 text-center">AlgoAura</h1>
          <p className="text-aa-gray text-center mb-8">WhatsApp CRM Dashboard</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
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
              className="w-full mt-6"
              icon={<FontAwesomeIcon icon={faRightToBracket} style={{ fontSize: 18 }} />}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-aa-gray uppercase tracking-wide">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              window.location.href = '/api/auth/google/start';
            }}
          >
            Continue with Google
          </Button>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setForgotOpen(true);
                setForgotError('');
                setForgotIdentifier(email || '');
              }}
              className="text-sm text-aa-orange font-semibold hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <p className="text-center text-aa-gray text-sm mt-6">
            New here?{' '}
            <button
              type="button"
              onClick={() => router.push('/signup')}
              className="text-aa-orange font-semibold hover:underline"
            >
              Create an account
            </button>
          </p>
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
