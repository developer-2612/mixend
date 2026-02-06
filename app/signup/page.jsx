'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faEnvelope, faLock, faPhone, faUser } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../components/auth/AuthProvider.jsx';

export default function SignupPage() {
  const router = useRouter();
  const { refresh, user, loading: authLoading } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showExistsPopup, setShowExistsPopup] = useState(false);
  const [existsMessage, setExistsMessage] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  const update = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.phone || !form.password) {
      setError('Name, phone, and password are required.');
      return;
    }

    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          const fields = data.fields || {};
          let message = data.error || 'Account already exists';
          if (fields.phone && fields.email) {
            message = 'This phone number and email already exist.';
          } else if (fields.phone) {
            message = 'This phone number already exists.';
          } else if (fields.email) {
            message = 'This email already exists.';
          }
          setExistsMessage(message);
          setShowExistsPopup(true);
          setLoading(false);
          return;
        }
        throw new Error(data.error || 'Signup failed');
      }

      await refresh();
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-aa-dark-blue to-aa-dark-blue/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-aa-orange rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-3xl">A</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-aa-dark-blue mb-2 text-center">Create Account</h1>
          <p className="text-aa-gray text-center mb-8">Get started with AlgoAura</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              label="Full Name"
              value={form.name}
              onChange={update('name')}
              placeholder="Your name"
              required
              icon={<FontAwesomeIcon icon={faUser} style={{ fontSize: 18 }} />}
            />

            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={update('email')}
              placeholder="your@email.com"
              icon={<FontAwesomeIcon icon={faEnvelope} style={{ fontSize: 18 }} />}
            />

            <Input
              label="Phone"
              value={form.phone}
              onChange={update('phone')}
              placeholder="9876543210"
              required
              icon={<FontAwesomeIcon icon={faPhone} style={{ fontSize: 18 }} />}
            />

            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={update('password')}
              placeholder="••••••••"
              required
              icon={<FontAwesomeIcon icon={faLock} style={{ fontSize: 18 }} />}
            />

            <Input
              label="Confirm Password"
              type="password"
              value={form.confirm}
              onChange={update('confirm')}
              placeholder="••••••••"
              required
              icon={<FontAwesomeIcon icon={faLock} style={{ fontSize: 18 }} />}
            />

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-6"
              icon={<FontAwesomeIcon icon={faUserPlus} style={{ fontSize: 18 }} />}
            >
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-aa-gray text-sm mt-6">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-aa-orange font-semibold hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>

      {showExistsPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 popup-overlay"
          onClick={() => setShowExistsPopup(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 popup-animate"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-aa-dark-blue mb-2">Account Already Exists</h2>
            <p className="text-aa-gray mb-6">{existsMessage}</p>
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => setShowExistsPopup(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
