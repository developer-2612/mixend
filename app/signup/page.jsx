'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
    businessCategory: '',
    businessType: 'both',
    password: '',
    confirm: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    setSuccess('');

    if (!form.name || !form.phone || !form.businessCategory || !form.password) {
      setError('Name, phone, business category, and password are required.');
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
          business_category: form.businessCategory,
          business_type: form.businessType,
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

      const data = await response.json().catch(() => ({}));
      if (data?.requires_activation) {
        setSuccess('Signup successful. Your account is pending super admin activation.');
        setTimeout(() => router.push('/login'), 1500);
        return;
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
    <div className="auth-v2-shell auth-v2-signup relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
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
        <div className="grid w-full gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="auth-v2-card rounded-[2rem] border border-white/60 bg-white/92 p-6 shadow-[0_26px_65px_rgba(10,31,68,0.22)] backdrop-blur-sm sm:p-8 lg:p-10">
            <div className="mb-6 flex justify-center">
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

            <h1 className="text-center text-3xl font-black text-aa-dark-blue">Create account</h1>
            <p className="mt-2 text-center text-sm text-aa-gray">Start your workspace in under a minute.</p>

            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            )}

            <form onSubmit={handleSignup} className="mt-6 space-y-4">
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="w-full">
                  <label className="block text-sm font-semibold text-aa-text-dark mb-2">
                    Business Category <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={form.businessCategory}
                    onChange={update('businessCategory')}
                    placeholder="Shop, Retail, Crackers..."
                  />
                  <p className="mt-1 text-xs text-aa-gray">
                    Add your business category name that customers understand quickly.
                  </p>
                </div>

                <div className="w-full">
                  <label className="block text-sm font-semibold text-aa-text-dark mb-2">
                    Business Type <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.businessType}
                      onChange={update('businessType')}
                      className="w-full rounded-lg border-2 border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-aa-orange sm:py-3 sm:text-base"
                    >
                      <option value="both">Both (Product + Service)</option>
                      <option value="product">Product-based</option>
                      <option value="service">Service-based</option>
                    </select>
                  </div>
                  <p className="mt-1 text-xs text-aa-gray">
                    Choose what you sell so we can enable only the right modules.
                  </p>
                </div>
              </div>

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
                className="mt-2 w-full rounded-xl py-3 text-base"
                icon={<FontAwesomeIcon icon={faUserPlus} style={{ fontSize: 18 }} />}
              >
                {loading ? 'Creating...' : 'Create Account'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-aa-gray">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="font-semibold text-aa-orange hover:underline"
              >
                Sign in
              </button>
            </p>
          </section>

          <aside className="auth-v2-panel hidden rounded-[2rem] border border-white/20 bg-aa-dark-blue/90 p-8 text-white shadow-[0_26px_70px_rgba(10,31,68,0.45)] backdrop-blur lg:flex lg:flex-col lg:justify-between">
            <div>
              <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-1 text-xs font-semibold tracking-[0.24em] uppercase">
                New Workspace
              </p>
              <h2 className="mt-6 text-4xl font-black leading-tight">
                Build your WhatsApp sales and service flow from day one.
              </h2>
              <p className="mt-4 text-sm text-white/80">
                Configure your business type once and let the dashboard show only what your team needs.
              </p>
            </div>
            <div className="space-y-3 text-sm text-white/85">
              <p className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">Dedicated contact timelines</p>
              <p className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">Business-type driven modules</p>
              <p className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">Controlled access + automation toggles</p>
            </div>
          </aside>
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
