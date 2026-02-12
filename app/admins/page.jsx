'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPen, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../components/auth/AuthProvider.jsx';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';
import Loader from '../components/common/Loader.jsx';
import Modal from '../components/common/Modal.jsx';
import Input from '../components/common/Input.jsx';

export default function AdminsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    id: null,
    name: '',
    email: '',
    phone: '',
    admin_tier: 'client_admin',
    status: 'active',
    profession: 'astrology',
    profession_request: '',
  });

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
      return { ok: true };
    } catch (err) {
      setError(err.message || 'Failed to update admin');
      return { ok: false, error: err };
    } finally {
      setUpdatingId(null);
    }
  };

  const openEdit = (admin) => {
    setEditError('');
    setEditForm({
      id: admin.id,
      name: admin.name || '',
      email: admin.email || '',
      phone: admin.phone || '',
      admin_tier: admin.admin_tier || 'client_admin',
      status: admin.status || 'active',
      profession: admin.profession || 'astrology',
      profession_request: admin.profession_request || '',
    });
    setEditOpen(true);
  };

  const handleEditChange = (field) => (event) => {
    setEditForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const saveEdit = async () => {
    if (!editForm.id) return;
    setEditSaving(true);
    setEditError('');
    try {
      const result = await updateAdmin(editForm.id, {
        admin_tier: editForm.admin_tier,
        status: editForm.status,
        profession: editForm.profession,
      });
      if (!result.ok) {
        throw result.error || new Error('Failed to update admin');
      }
      setEditOpen(false);
    } catch (err) {
      setEditError(err.message || 'Failed to update admin');
    } finally {
      setEditSaving(false);
    }
  };

  const toggleStatus = async (admin) => {
    const nextStatus = admin.status === 'active' ? 'inactive' : 'active';
    const result = await updateAdmin(admin.id, { status: nextStatus });
    if (!result.ok) {
      setEditError(result.error?.message || 'Failed to update admin');
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
  const roleColors = {
    super_admin: 'blue',
    client_admin: 'orange',
  };
  const professionOptions = [
    { value: 'astrology', label: 'Astrology' },
    { value: 'clinic', label: 'Clinic' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'salon', label: 'Salon' },
    { value: 'shop', label: 'Retail Shop' },
  ];

  if (authLoading || (user && user.admin_tier !== 'super_admin')) {
    return null;
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader size="lg" text="Loading admins..." />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admins-page">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-aa-dark-blue mb-2">Admins</h1>
          <p className="text-aa-gray">Manage your admin members and their roles</p>
        </div>
        <Button
          variant="primary"
          icon={<FontAwesomeIcon icon={faRotateRight} style={{ fontSize: 18 }} />}
          className="w-full sm:w-auto"
          onClick={fetchAdmins}
        >
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-aa-gray mb-2">Total Admins</h3>
          <p className="text-3xl font-bold text-aa-dark-blue">{totalCount}</p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-aa-gray mb-2">Super Admins</h3>
          <p className="text-3xl font-bold text-aa-orange">{superCount}</p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-aa-gray mb-2">Active</h3>
          <p className="text-3xl font-bold text-green-600">{activeCount}</p>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Input
          placeholder="Search by name, email, phone, role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAdmins.length === 0 ? (
          <Card>
            <p className="text-aa-gray text-sm">No admins found.</p>
          </Card>
        ) : (
          filteredAdmins.map((admin) => (
            <Card key={admin.id} data-testid={`admin-card-${admin.id}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-aa-dark-blue flex items-center justify-center">
                    <span className="text-white font-bold text-xl">
                      {admin.name?.charAt(0) || 'A'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-aa-dark-blue">{admin.name || 'Unnamed'}</h3>
                    <Badge variant={roleColors[admin.admin_tier] || 'default'}>
                      {admin.admin_tier === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-sm text-aa-gray">{admin.email || '—'}</div>
                <div className="text-sm text-aa-gray">{admin.phone || '—'}</div>
                <div className="text-sm text-aa-gray">Profession: {admin.profession || 'astrology'}</div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${admin.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                  <span className="text-sm text-aa-gray">
                    {admin.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {admin.profession_request && (
                  <div className="text-xs text-aa-gray">
                    Requested: {admin.profession_request}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1 text-sm py-2"
                  onClick={() => openEdit(admin)}
                  disabled={updatingId === admin.id}
                >
                  <FontAwesomeIcon icon={faUserPen} />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 text-sm py-2 text-red-600 hover:bg-red-50"
                  onClick={() => toggleStatus(admin)}
                  disabled={updatingId === admin.id}
                >
                  {admin.status === 'active' ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Admin"
        size="md"
      >
        <div className="space-y-4">
          {editError && <p className="text-sm text-red-600">{editError}</p>}
          <Input label="Name" value={editForm.name} onChange={handleEditChange('name')} disabled />
          <Input label="Email" value={editForm.email} onChange={handleEditChange('email')} disabled />
          <Input label="Phone" value={editForm.phone} onChange={handleEditChange('phone')} disabled />

          <div>
            <label className="block text-sm font-semibold text-aa-text-dark mb-2">Role</label>
            <select
              value={editForm.admin_tier}
              onChange={handleEditChange('admin_tier')}
              className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg outline-none focus:border-aa-orange"
            >
              <option value="super_admin">Super Admin</option>
              <option value="client_admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-aa-text-dark mb-2">Profession</label>
            <select
              value={editForm.profession}
              onChange={handleEditChange('profession')}
              className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg outline-none focus:border-aa-orange"
            >
              {professionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-aa-text-dark mb-2">Status</label>
            <select
              value={editForm.status}
              onChange={handleEditChange('status')}
              className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg outline-none focus:border-aa-orange"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {editForm.profession_request && (
            <div className="rounded-lg border border-aa-orange/30 bg-aa-orange/10 px-4 py-3 text-sm text-aa-dark-blue">
              Requested: {editForm.profession_request}
              <div className="mt-2">
                <Button
                  variant="outline"
                  className="text-sm"
                  onClick={() => setEditForm((prev) => ({ ...prev, profession: prev.profession_request }))}
                >
                  Apply Requested Profession
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveEdit} disabled={editSaving}>
              {editSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
