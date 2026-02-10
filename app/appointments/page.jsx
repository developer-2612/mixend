'use client';

import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarCheck, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      fetchAppointments({ reset: true, nextOffset: 0, searchTerm: search, status: filterStatus });
    }, 300);
    return () => clearTimeout(handle);
  }, [search, filterStatus]);

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

  const getStatusColor = (status) => {
    switch(status) {
      case 'booked': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-aa-orange mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FontAwesomeIcon icon={faCalendarCheck} className="text-aa-orange" style={{ fontSize: 32 }} />
          Appointments
        </h1>

        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute left-3 top-3 text-gray-400"
              style={{ fontSize: 20 }}
            />
            <input
              type="text"
              placeholder="Search by name, phone, type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aa-orange"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aa-orange"
          >
            <option value="all">All Status</option>
            <option value="booked">Booked</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {appointments.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FontAwesomeIcon icon={faCalendarCheck} className="mx-auto text-gray-400 mb-2" style={{ fontSize: 48 }} />
            <p className="text-gray-500">No appointments found</p>
          </div>
        ) : (
          appointments.map((appt) => (
            <div
              key={appt.id}
              className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{appt.user_name || 'Unknown'}</h3>
                  <p className="text-sm text-gray-600">{appt.phone || '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(appt.status)}`}>
                    {String(appt.status || 'booked').replace('_', ' ').toUpperCase()}
                  </span>
                  <select
                    value={appt.status || 'booked'}
                    onChange={(e) => updateStatus(appt.id, e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-aa-orange"
                    disabled={updatingId === appt.id}
                    aria-label="Update appointment status"
                  >
                    <option value="booked">Booked</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <p className="text-gray-700 mb-3">{appt.appointment_type || 'Appointment'}</p>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="text-gray-500">
                  Date: {appt.start_time ? new Date(appt.start_time).toLocaleDateString() : '—'}
                </span>
                <span className="text-gray-500">
                  Time: {appt.start_time ? new Date(appt.start_time).toLocaleTimeString() : '—'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

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
    </div>
  );
}
