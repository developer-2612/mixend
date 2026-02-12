'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarCheck,
  faMagnifyingGlass,
  faListUl,
  faTableColumns,
  faMoneyBillWave,
  faClock,
  faPenToSquare,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../components/auth/AuthProvider.jsx';
import Card from '../components/common/Card.jsx';
import Modal from '../components/common/Modal.jsx';
import Input from '../components/common/Input.jsx';
import Button from '../components/common/Button.jsx';

export default function AppointmentsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [viewMode, setViewMode] = useState('board');
  const [editOpen, setEditOpen] = useState(false);
  const [editMode, setEditMode] = useState('edit');
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
    user_id: '',
    status: 'booked',
    appointment_type: '',
    start_time: '',
    end_time: '',
    payment_total: '',
    payment_paid: '',
    payment_method: '',
    payment_notes: '',
  });

  const label = useMemo(() => {
    const appointmentProfessions = new Set(['astrology', 'clinic', 'salon', 'gym', 'spa', 'doctor', 'consultant']);
    const bookingProfessions = new Set([
      'restaurant',
      'hotel',
      'resort',
      'hostel',
      'motel',
      'inn',
      'lodge',
      'guesthouse',
      'cafe',
      'café',
    ]);
    if (!user?.profession) return 'Bookings';
    if (appointmentProfessions.has(user.profession) && !bookingProfessions.has(user.profession)) {
      return 'Appointments';
    }
    return 'Bookings';
  }, [user?.profession]);
  const labelLower = label.toLowerCase();

  useEffect(() => {
    const handle = setTimeout(() => {
      fetchAppointments({ reset: true, nextOffset: 0, searchTerm: search, status: filterStatus });
    }, 300);
    return () => clearTimeout(handle);
  }, [search, filterStatus]);

  useEffect(() => {
    if (autoOpened) return;
    const shouldOpen = searchParams?.get('new') === '1';
    if (shouldOpen) {
      openCreate();
      setAutoOpened(true);
    }
  }, [searchParams, autoOpened]);

  const loadContacts = async () => {
    setContactsLoading(true);
    try {
      const response = await fetch('/api/users?limit=500', { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load contacts');
      }
      setContacts(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  };

  async function fetchAppointments({ reset = false, nextOffset = 0, searchTerm = '', status = 'all' } = {}) {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      params.set('offset', String(nextOffset));
      if (searchTerm) params.set('q', searchTerm);
      if (status && status !== 'all') params.set('status', status);
      const response = await fetch(`/api/appointments?${params.toString()}`, { credentials: 'include' });
      const data = await response.json();
      const list = data.data || [];
      const meta = data.meta || {};
      setHasMore(Boolean(meta.hasMore));
      setOffset(meta.nextOffset ?? nextOffset + list.length);
      if (reset) {
        setAppointments(list);
      } else {
        setAppointments((prev) => [...prev, ...list]);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      if (reset) {
        setAppointments([]);
        setHasMore(false);
        setOffset(0);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function updateStatus(appointmentId, status) {
    const previous = appointments;
    setUpdatingId(appointmentId);
    setAppointments((prev) =>
      prev.map((appt) => (appt.id === appointmentId ? { ...appt, status } : appt))
    );

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }
      setAppointments((prev) =>
        prev.map((appt) => (appt.id === appointmentId ? data.data : appt))
      );
    } catch (error) {
      console.error('Failed to update appointment:', error);
      setAppointments(previous);
    } finally {
      setUpdatingId(null);
    }
  }

  const toInputDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  };

  const getPaymentStatus = (appt) => {
    if (appt?.payment_status) return appt.payment_status;
    const total = Number(appt?.payment_total || 0);
    const paid = Number(appt?.payment_paid || 0);
    if (!total && !paid) return 'unpaid';
    if (paid <= 0) return 'unpaid';
    if (total > 0 && paid < total) return 'partial';
    return 'paid';
  };

  const getPaymentBadge = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'partial':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPaymentSummary = (appt) => {
    const total = appt?.payment_total !== null && appt?.payment_total !== undefined
      ? Number(appt.payment_total)
      : null;
    const paid = appt?.payment_paid !== null && appt?.payment_paid !== undefined
      ? Number(appt.payment_paid)
      : null;
    const due =
      total !== null && paid !== null && Number.isFinite(total) && Number.isFinite(paid)
        ? Math.max(0, total - paid)
        : null;
    return { total, paid, due };
  };

  const toInputNumber = (value) => {
    if (value === null || value === undefined || value === '') return '';
    return String(value);
  };

  const openEdit = (appt) => {
    setEditError('');
    setEditMode('edit');
    setEditForm({
      id: appt.id,
      user_id: appt.user_id || '',
      status: appt.status || 'booked',
      appointment_type: appt.appointment_type || '',
      start_time: toInputDateTime(appt.start_time),
      end_time: toInputDateTime(appt.end_time),
      payment_total: toInputNumber(appt.payment_total),
      payment_paid: toInputNumber(appt.payment_paid),
      payment_method: appt.payment_method || '',
      payment_notes: appt.payment_notes || '',
    });
    setEditOpen(true);
  };

  const openCreate = () => {
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    setEditError('');
    setEditMode('create');
    setEditForm({
      id: null,
      user_id: '',
      status: 'booked',
      appointment_type: '',
      start_time: toInputDateTime(now),
      end_time: toInputDateTime(end),
      payment_total: '',
      payment_paid: '',
      payment_method: '',
      payment_notes: '',
    });
    setEditOpen(true);
    loadContacts();
  };

  const handleEditChange = (field) => (event) => {
    setEditForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const saveEdit = async () => {
    setEditSaving(true);
    setEditError('');
    try {
      const payload = {
        status: editForm.status,
        appointment_type: editForm.appointment_type,
        payment_total: editForm.payment_total === '' ? null : Number(editForm.payment_total),
        payment_paid: editForm.payment_paid === '' ? null : Number(editForm.payment_paid),
        payment_method: editForm.payment_method,
        payment_notes: editForm.payment_notes,
      };
      if (editForm.start_time) {
        payload.start_time = new Date(editForm.start_time).toISOString();
      }
      if (editForm.end_time) {
        payload.end_time = new Date(editForm.end_time).toISOString();
      }
      if (editMode === 'create' && (!payload.start_time || !payload.end_time)) {
        throw new Error('Start and end time are required.');
      }

      let response;
      if (editMode === 'create') {
        if (!editForm.user_id) {
          throw new Error('Please select a contact.');
        }
        response = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...payload,
            user_id: Number(editForm.user_id),
          }),
        });
      } else {
        if (!editForm.id) return;
        response = await fetch(`/api/appointments/${editForm.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update appointment');
      }
      if (editMode === 'create') {
        await fetchAppointments({ reset: true, nextOffset: 0, searchTerm: search, status: filterStatus });
      } else {
        setAppointments((prev) => prev.map((appt) => (appt.id === editForm.id ? data.data : appt)));
      }
      setEditOpen(false);
    } catch (error) {
      setEditError(error.message || 'Failed to save appointment');
    } finally {
      setEditSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'booked': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const statusColumns = useMemo(() => {
    const columns = [
      { key: 'booked', label: 'Booked' },
      { key: 'completed', label: 'Completed' },
      { key: 'cancelled', label: 'Cancelled' },
    ];
    if (filterStatus === 'all') {
      return columns;
    }
    return columns.filter((col) => col.key === filterStatus);
  }, [filterStatus]);

  const appointmentsByStatus = useMemo(() => {
    const grouped = {};
    statusColumns.forEach((col) => {
      grouped[col.key] = [];
    });
    appointments.forEach((appt) => {
      const key = appt.status || 'booked';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(appt);
    });
    return grouped;
  }, [appointments, statusColumns]);

  const statusSummary = useMemo(() => {
    const base = { booked: 0, completed: 0, cancelled: 0 };
    appointments.forEach((appt) => {
      const key = appt.status || 'booked';
      if (base[key] !== undefined) {
        base[key] += 1;
      }
    });
    return base;
  }, [appointments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aa-orange mx-auto mb-4"></div>
          <p className="text-gray-600">Loading {labelLower}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FontAwesomeIcon icon={faCalendarCheck} className="text-aa-orange" style={{ fontSize: 32 }} />
          {label}
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {[
            { key: 'booked', label: 'Booked', tone: 'bg-blue-50 text-blue-800', count: statusSummary.booked },
            { key: 'completed', label: 'Completed', tone: 'bg-green-50 text-green-800', count: statusSummary.completed },
            { key: 'cancelled', label: 'Cancelled', tone: 'bg-gray-50 text-gray-700', count: statusSummary.cancelled },
          ].map((item) => (
            <div key={item.key} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs uppercase text-aa-gray font-semibold">{item.label}</p>
              <p className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${item.tone}`}>
                {item.count}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-3 mb-4 lg:items-end">
          <div className="flex-1 relative">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute left-3 top-3 text-gray-400"
              style={{ fontSize: 20 }}
            />
            <input
              type="text"
              placeholder={`Search ${labelLower} by name, phone, type...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aa-orange"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Button variant="primary" onClick={openCreate}>
              Create {label.slice(0, -1)}
            </Button>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-auto sm:min-w-[180px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aa-orange"
            >
              <option value="all">All Status</option>
              <option value="booked">Booked</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <div className="inline-flex rounded-full border border-gray-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                  viewMode === 'list'
                    ? 'bg-aa-dark-blue text-white'
                    : 'text-aa-gray hover:text-aa-dark-blue'
                }`}
              >
                <FontAwesomeIcon icon={faListUl} />
                List
              </button>
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                  viewMode === 'board'
                    ? 'bg-aa-dark-blue text-white'
                    : 'text-aa-gray hover:text-aa-dark-blue'
                }`}
              >
                <FontAwesomeIcon icon={faTableColumns} />
                Board
              </button>
            </div>
          </div>
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FontAwesomeIcon icon={faCalendarCheck} className="mx-auto text-gray-400 mb-2" style={{ fontSize: 48 }} />
          <p className="text-gray-500">No {labelLower} found</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <div
              key={appt.id}
              className="bg-white p-4 rounded-xl border border-gray-200 hover:shadow-md transition"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-bold text-lg text-gray-900">{appt.user_name || 'Unknown'}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(appt.status)}`}>
                      {String(appt.status || 'booked').replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPaymentBadge(getPaymentStatus(appt))}`}>
                      {getPaymentStatus(appt).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{appt.phone || '—'}</p>
                  <p className="text-gray-700 mt-2">{appt.appointment_type || label.slice(0, -1)}</p>
                  <div className="flex flex-wrap gap-4 text-sm mt-3">
                    <span className="text-gray-500 flex items-center gap-2">
                      <FontAwesomeIcon icon={faClock} />
                      {appt.start_time ? new Date(appt.start_time).toLocaleDateString() : '—'} •{' '}
                      {appt.start_time ? new Date(appt.start_time).toLocaleTimeString() : '—'}
                    </span>
                    {(() => {
                      const summary = getPaymentSummary(appt);
                      if (summary.total === null && summary.paid === null) return null;
                      return (
                        <span className="text-gray-500 flex items-center gap-2">
                          <FontAwesomeIcon icon={faMoneyBillWave} />
                          Paid {summary.paid ?? 0} / {summary.total ?? 0}
                          {summary.due !== null ? ` • Due ${summary.due}` : ''}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={appt.status || 'booked'}
                    onChange={(e) => updateStatus(appt.id, e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aa-orange"
                    disabled={updatingId === appt.id}
                    aria-label="Update appointment status"
                  >
                    <option value="booked">Booked</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <Button
                    variant="outline"
                    className="text-sm px-4 py-2"
                    onClick={() => openEdit(appt)}
                  >
                    <FontAwesomeIcon icon={faPenToSquare} />
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {statusColumns.map((col) => (
            <Card key={col.key} className="p-4 bg-gray-50/60 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase text-aa-gray font-semibold">{col.label}</p>
                  <p className="text-sm text-aa-gray">{appointmentsByStatus[col.key]?.length || 0} items</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(col.key)}`}>
                  {col.label}
                </span>
              </div>

              <div className="space-y-3">
                {(appointmentsByStatus[col.key] || []).length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-white p-4 text-sm text-aa-gray">
                    No {col.label.toLowerCase()} {labelLower}.
                  </div>
                ) : (
                  appointmentsByStatus[col.key].map((appt) => (
                    <div key={appt.id} className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-aa-text-dark">{appt.user_name || 'Unknown'}</p>
                          <p className="text-xs text-aa-gray">{appt.phone || '—'}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPaymentBadge(getPaymentStatus(appt))}`}>
                          {getPaymentStatus(appt).toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-3 text-sm text-aa-text-dark">
                        {appt.appointment_type || label.slice(0, -1)}
                      </div>
                      <div className="mt-2 text-xs text-aa-gray">
                        {appt.start_time ? new Date(appt.start_time).toLocaleDateString() : '—'} •{' '}
                        {appt.start_time ? new Date(appt.start_time).toLocaleTimeString() : '—'}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <select
                          value={appt.status || 'booked'}
                          onChange={(e) => updateStatus(appt.id, e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-aa-orange"
                          disabled={updatingId === appt.id}
                          aria-label="Update appointment status"
                        >
                          <option value="booked">Booked</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button
                          type="button"
                          className="px-3 py-1 text-xs font-semibold text-aa-orange border border-aa-orange rounded-full hover:bg-aa-orange hover:text-white transition"
                          onClick={() => openEdit(appt)}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() =>
              fetchAppointments({
                reset: false,
                nextOffset: offset,
                searchTerm: search,
                status: filterStatus,
              })
            }
            disabled={loadingMore}
            className="px-5 py-2 rounded-full border border-aa-orange text-aa-orange font-semibold hover:bg-aa-orange hover:text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}

      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title={`${editMode === 'create' ? 'Create' : 'Edit'} ${label.slice(0, -1)}`}
        size="lg"
      >
        <div className="space-y-5">
          {editError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {editError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editMode === 'create' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-aa-text-dark mb-2">Contact</label>
                <select
                  value={editForm.user_id}
                  onChange={handleEditChange('user_id')}
                  className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg outline-none focus:border-aa-orange"
                >
                  <option value="">Select contact</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name || 'Unknown'} • {contact.phone || '—'}
                    </option>
                  ))}
                </select>
                {contactsLoading && (
                  <p className="text-xs text-aa-gray mt-2">Loading contacts...</p>
                )}
              </div>
            )}
            <Input
              label="Appointment Type"
              value={editForm.appointment_type}
              onChange={handleEditChange('appointment_type')}
              placeholder="Consultation"
            />
            <div>
              <label className="block text-sm font-semibold text-aa-text-dark mb-2">Status</label>
              <select
                value={editForm.status}
                onChange={handleEditChange('status')}
                className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg outline-none focus:border-aa-orange"
              >
                <option value="booked">Booked</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <Input
              label="Start Time"
              type="datetime-local"
              value={editForm.start_time}
              onChange={handleEditChange('start_time')}
            />
            <Input
              label="End Time"
              type="datetime-local"
              value={editForm.end_time}
              onChange={handleEditChange('end_time')}
            />
          </div>

          <div className="rounded-xl border border-gray-200 p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-aa-dark-blue">
              <FontAwesomeIcon icon={faMoneyBillWave} />
              Payment Details
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Total Amount"
                type="number"
                value={editForm.payment_total}
                onChange={handleEditChange('payment_total')}
                placeholder="0"
              />
              <Input
                label="Paid Amount"
                type="number"
                value={editForm.payment_paid}
                onChange={handleEditChange('payment_paid')}
                placeholder="0"
              />
              <div>
                <label className="block text-sm font-semibold text-aa-text-dark mb-2">Payment Method</label>
                <select
                  value={editForm.payment_method}
                  onChange={handleEditChange('payment_method')}
                  className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg outline-none focus:border-aa-orange"
                >
                  <option value="">Select method</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="wallet">Wallet</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-aa-text-dark mb-2">Payment Notes</label>
              <textarea
                value={editForm.payment_notes}
                onChange={handleEditChange('payment_notes')}
                rows="3"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg outline-none focus:border-aa-orange text-sm"
                placeholder="Add partial payment details or receipts"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
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
