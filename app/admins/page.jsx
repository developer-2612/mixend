'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserShield, faUserSlash } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../components/auth/AuthProvider.jsx';

export default function AdminsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user && user.admin_tier !== 'super_admin') {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || user.admin_tier !== 'super_admin') return;
    fetchAdmins();
  }, [user]);

  const fetchAdmins = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admins', { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load admins');
      }
      setAdmins(data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const updateAdmin = async (adminId, payload) => {
    setUpdatingId(adminId);
    setError('');
    try {
      const response = await fetch(`/api/admins/${adminId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update admin');
      }
      setAdmins((prev) =>
        prev.map((admin) => (admin.id === adminId ? data.data : admin))
      );
    } catch (err) {
      setError(err.message || 'Failed to update admin');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredAdmins = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return admins;
    return admins.filter((admin) =>
      [admin.name, admin.email, admin.phone, admin.admin_tier, admin.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [admins, search]);

  const totalCount = admins.length;
  const superCount = admins.filter((admin) => admin.admin_tier === 'super_admin').length;
  const activeCount = admins.filter((admin) => admin.status === 'active').length;

  if (authLoading || (user && user.admin_tier !== 'super_admin')) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aa-orange mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admins...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admins</h1>
          <p className="text-gray-600 mt-1">Manage admin access and roles</p>
        </div>
        <button
          onClick={fetchAdmins}
          className="px-4 py-2 rounded-full border border-aa-orange text-aa-orange font-semibold hover:bg-aa-orange hover:text-white transition"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Admins</p>
          <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Super Admins</p>
          <p className="text-2xl font-bold text-gray-900">{superCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by name, email, phone, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aa-orange"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-3 text-sm font-semibold text-gray-500 uppercase">Admin</th>
                <th className="text-left py-3 px-3 text-sm font-semibold text-gray-500 uppercase">Contact</th>
                <th className="text-left py-3 px-3 text-sm font-semibold text-gray-500 uppercase">Role</th>
                <th className="text-left py-3 px-3 text-sm font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left py-3 px-3 text-sm font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-gray-500">
                    No admins found.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => {
                  const isSelf = admin.id === user.id;
                  return (
                    <tr key={admin.id} className="border-b border-gray-100">
                      <td className="py-4 px-3">
                        <p className="font-semibold text-gray-900">{admin.name || 'Unnamed'}</p>
                        <p className="text-xs text-gray-500">ID: {admin.id}</p>
                      </td>
                      <td className="py-4 px-3 text-sm text-gray-600">
                        <p>{admin.email || '—'}</p>
                        <p>{admin.phone || '—'}</p>
                      </td>
                      <td className="py-4 px-3">
                        <select
                          value={admin.admin_tier}
                          onChange={(e) => updateAdmin(admin.id, { admin_tier: e.target.value })}
                          disabled={isSelf || updatingId === admin.id}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-aa-orange disabled:opacity-60"
                        >
                          <option value="super_admin">Super Admin</option>
                          <option value="client_admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-4 px-3">
                        <select
                          value={admin.status}
                          onChange={(e) => updateAdmin(admin.id, { status: e.target.value })}
                          disabled={isSelf || updatingId === admin.id}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-aa-orange disabled:opacity-60"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                      <td className="py-4 px-3 text-sm text-gray-600">
                        {admin.status === 'active' ? (
                          <span className="inline-flex items-center gap-2 text-green-700">
                            <FontAwesomeIcon icon={faUserShield} />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-red-600">
                            <FontAwesomeIcon icon={faUserSlash} />
                            Disabled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
