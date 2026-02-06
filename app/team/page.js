'use client';
import { useEffect, useState } from 'react';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';
import Loader from '../components/common/Loader.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faEnvelope, faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';

export default function TeamPage() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const response = await fetch('/api/team', { credentials: 'include' });
      const data = await response.json();
      setTeam(data.data || []);
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  const roleColors = {
    admin: 'orange',
    manager: 'blue',
    agent: 'green',
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader size="lg" text="Loading team..." />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="team-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-aa-dark-blue mb-2">Team</h1>
          <p className="text-aa-gray">Manage your team members and their roles</p>
        </div>
        <Button variant="primary" icon={<FontAwesomeIcon icon={faUserPlus} style={{ fontSize: 18 }} />}>
          Add Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-aa-gray mb-2">Total Members</h3>
          <p className="text-3xl font-bold text-aa-dark-blue">{team.length}</p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-aa-gray mb-2">Active Now</h3>
          <p className="text-3xl font-bold text-green-600">
            {team.filter(m => m.status === 'active').length}
          </p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-aa-gray mb-2">Agents</h3>
          <p className="text-3xl font-bold text-aa-orange">
            {team.filter(m => m.role === 'agent').length}
          </p>
        </Card>
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {team.map(member => (
          <Card key={member.id} data-testid={`team-member-${member.id}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-aa-dark-blue flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    {member.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-aa-dark-blue">{member.name}</h3>
                  <Badge variant={roleColors[member.role] || 'default'}>{member.role || 'member'}</Badge>
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <FontAwesomeIcon icon={faEllipsisVertical} className="text-aa-gray" style={{ fontSize: 18 }} />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-aa-gray">
                <FontAwesomeIcon icon={faEnvelope} style={{ fontSize: 14 }} />
                {member.email || '—'}
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${member.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                <span className="text-sm text-aa-gray">{member.status === 'active' ? 'Active' : 'Inactive'}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xl font-bold text-aa-dark-blue">{member.active_chats || 0}</p>
                  <p className="text-xs text-aa-gray">Active Chats</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-aa-orange">{member.messages_sent || 0}</p>
                  <p className="text-xs text-aa-gray">Messages</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-green-600">
                    {member.rating ? `★ ${member.rating}` : '—'}
                  </p>
                  <p className="text-xs text-aa-gray">Rating</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1 text-sm py-2">Edit</Button>
              <Button variant="ghost" className="flex-1 text-sm py-2 text-red-600 hover:bg-red-50">Remove</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
