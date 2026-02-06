'use client';
import { useEffect, useState } from 'react';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';
import Modal from '../components/common/Modal.jsx';
import Input from '../components/common/Input.jsx';
import Loader from '../components/common/Loader.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaperPlane,
  faCalendarDays,
  faUsers,
  faCircleCheck,
  faCircleXmark,
  faClock,
} from '@fortawesome/free-solid-svg-icons';

export default function BroadcastPage() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBroadcast, setNewBroadcast] = useState({
    title: '',
    message: '',
    target_audience: 'all',
    scheduled_at: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [broadcastsRes, contactsRes] = await Promise.all([
        fetch('/api/broadcasts', { credentials: 'include' }),
        fetch('/api/users', { credentials: 'include' })
      ]);
      const broadcastsData = await broadcastsRes.json();
      const contactsData = await contactsRes.json();
      setBroadcasts(broadcastsData.data || []);
      setContacts(contactsData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBroadcast = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: newBroadcast.title,
          message: newBroadcast.message,
          target_audience: newBroadcast.target_audience,
          scheduled_at: newBroadcast.scheduled_at,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create broadcast');
      }
      setShowCreateModal(false);
      setNewBroadcast({ title: '', message: '', target_audience: 'all', scheduled_at: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating broadcast:', error);
    }
  };

  const statusIcons = {
    sent: <FontAwesomeIcon icon={faCircleCheck} className="text-green-600" style={{ fontSize: 18 }} />,
    scheduled: <FontAwesomeIcon icon={faClock} className="text-yellow-600" style={{ fontSize: 18 }} />,
    draft: <FontAwesomeIcon icon={faClock} className="text-gray-600" style={{ fontSize: 18 }} />,
    failed: <FontAwesomeIcon icon={faCircleXmark} className="text-red-600" style={{ fontSize: 18 }} />
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader size="lg" text="Loading broadcasts..." />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="broadcast-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-aa-dark-blue mb-2">Broadcast</h1>
          <p className="text-aa-gray">Send messages to multiple contacts at once</p>
        </div>
        <Button
          variant="primary"
          icon={<FontAwesomeIcon icon={faPaperPlane} style={{ fontSize: 18 }} />}
          onClick={() => setShowCreateModal(true)}
        >
          Create Campaign
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-aa-gray text-sm font-semibold mb-1">Total Campaigns</p>
              <h3 className="text-2xl font-bold text-aa-dark-blue">{broadcasts.length}</h3>
            </div>
            <div className="w-12 h-12 bg-aa-orange/10 rounded-lg flex items-center justify-center">
              <FontAwesomeIcon icon={faPaperPlane} className="text-aa-orange" style={{ fontSize: 24 }} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-aa-gray text-sm font-semibold mb-1">Total Sent</p>
              <h3 className="text-2xl font-bold text-aa-dark-blue">
                {broadcasts.reduce((sum, b) => sum + (b.sent_count || 0), 0)}
              </h3>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FontAwesomeIcon icon={faCircleCheck} className="text-green-600" style={{ fontSize: 24 }} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-aa-gray text-sm font-semibold mb-1">Delivered</p>
              <h3 className="text-2xl font-bold text-aa-dark-blue">
                {broadcasts.reduce((sum, b) => sum + (b.delivered_count || 0), 0)}
              </h3>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FontAwesomeIcon icon={faUsers} className="text-aa-dark-blue" style={{ fontSize: 24 }} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-aa-gray text-sm font-semibold mb-1">Scheduled</p>
              <h3 className="text-2xl font-bold text-aa-dark-blue">
                {broadcasts.filter(b => b.status === 'scheduled').length}
              </h3>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <FontAwesomeIcon icon={faCalendarDays} className="text-yellow-600" style={{ fontSize: 24 }} />
            </div>
          </div>
        </Card>
      </div>

      {/* Broadcast History */}
      <Card>
        <h3 className="text-xl font-bold text-aa-dark-blue mb-4">Campaign History</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-4 text-sm font-semibold text-aa-gray uppercase">Campaign</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-aa-gray uppercase">Status</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-aa-gray uppercase">Sent</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-aa-gray uppercase">Delivered</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-aa-gray uppercase">Created By</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-aa-gray uppercase">Date</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-aa-gray uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map(broadcast => (
                <tr key={broadcast.id} className="border-b border-gray-100 hover:bg-gray-50" data-testid={`broadcast-${broadcast.id}`}>
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-semibold text-aa-text-dark">{broadcast.title}</p>
                      <p className="text-xs text-aa-gray mt-1 truncate max-w-xs">{broadcast.message}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {statusIcons[broadcast.status]}
                      <Badge variant={
                        broadcast.status === 'sent' ? 'green' :
                        broadcast.status === 'scheduled' ? 'yellow' :
                        broadcast.status === 'failed' ? 'red' : 'default'
                      }>
                        {broadcast.status}
                      </Badge>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-semibold text-aa-dark-blue">{broadcast.sent_count}</td>
                  <td className="py-4 px-4 font-semibold text-green-600">{broadcast.delivered_count}</td>
                  <td className="py-4 px-4 text-aa-gray text-sm">{broadcast.created_by_name || 'System'}</td>
                  <td className="py-4 px-4 text-aa-gray text-sm">
                    {new Date(broadcast.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4">
                    <button className="text-aa-orange hover:underline text-sm font-semibold">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Broadcast Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Broadcast Campaign" size="lg">
        <form onSubmit={handleCreateBroadcast} className="space-y-4">
          <Input
            label="Campaign Title"
            value={newBroadcast.title}
            onChange={(e) => setNewBroadcast({ ...newBroadcast, title: e.target.value })}
            placeholder="Enter campaign title"
            required
          />
          
          <div>
            <label className="block text-sm font-semibold text-aa-text-dark mb-2">Message</label>
            <textarea
              value={newBroadcast.message}
              onChange={(e) => setNewBroadcast({ ...newBroadcast, message: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg outline-none focus:border-aa-orange"
              rows="5"
              placeholder="Type your broadcast message..."
              required
            />
            <p className="text-xs text-aa-gray mt-1">{newBroadcast.message.length} characters</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-aa-text-dark mb-2">Target Audience</label>
            <select
              value={newBroadcast.target_audience}
              onChange={(e) => setNewBroadcast({ ...newBroadcast, target_audience: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg outline-none focus:border-aa-orange"
            >
              <option value="all">All Contacts ({contacts.length})</option>
              <option value="vip">VIP Contacts</option>
              <option value="new">New Contacts</option>
              <option value="interested">Interested Contacts</option>
            </select>
          </div>

          <Input
            label="Schedule Date & Time (Optional)"
            type="datetime-local"
            value={newBroadcast.scheduled_at}
            onChange={(e) => setNewBroadcast({ ...newBroadcast, scheduled_at: e.target.value })}
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              icon={<FontAwesomeIcon icon={faPaperPlane} style={{ fontSize: 18 }} />}
            >
              Create Campaign
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
