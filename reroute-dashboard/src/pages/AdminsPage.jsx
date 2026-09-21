import React, { useState, useEffect } from 'react';
import api from '../api';

export default function AdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newInvite, setNewInvite] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError('');
      const [adminsRes, invitesRes] = await Promise.all([
        api.get('/admins').catch(() => ({ data: { admins: [] } })),
        api.get('/admins/invites').catch(() => ({ data: { invites: [] } })),
      ]);
      setAdmins(adminsRes.data.admins || []);
      setInvites(invitesRes.data.invites || []);
    } catch (err) {
      setError('Failed to fetch administrator accounts.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvite = async () => {
    try {
      setGenerating(true);
      setError('');
      const res = await api.post('/admins/invite');
      setNewInvite(res.data.invite);
      fetchAdmins();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate invite code.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteAdmin = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove admin access for ${name}?`)) return;
    try {
      await api.delete(`/admins/${id}`);
      setAdmins(admins.filter(a => a._id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete administrator.');
    }
  };

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
        <div>
          <h1 className="font-sans text-headline-md text-on-surface">Campus Administrators</h1>
          <p className="font-sans text-body-md text-on-surface-variant mt-1">
            Maintain authorized accounts and generate registration invite codes
          </p>
        </div>
        <button
          onClick={handleGenerateInvite}
          disabled={generating}
          className="flex items-center gap-xs px-sm py-xs bg-secondary text-on-secondary font-sans text-label-md font-semibold rounded-lg hover:bg-on-secondary-fixed-variant transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>key</span>
          {generating ? 'Generating...' : 'Create Invite Code'}
        </button>
      </div>

      {/* New Invite Success Notification */}
      {newInvite && (
        <div className="bg-primary-fixed text-on-primary-fixed p-md rounded-xl border border-secondary flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-[24px]">confirmation_number</span>
            <div>
              <p className="font-semibold text-body-lg font-mono tracking-wider">{newInvite.code}</p>
              <p className="text-label-sm text-on-primary-fixed-variant">
                Single-use invite code. Provide this to the new admin for registration.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(newInvite.code);
              alert('Copied to clipboard!');
            }}
            className="px-sm py-xs bg-secondary text-on-secondary text-label-sm font-semibold rounded hover:bg-on-secondary-fixed-variant"
          >
            Copy
          </button>
        </div>
      )}

      {error && (
        <div className="bg-error-container text-on-error-container p-sm rounded-lg text-body-md flex items-center gap-xs">
          <span className="material-symbols-outlined text-[20px]">error</span>
          {error}
        </div>
      )}

      {/* Admin Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
        <div className="px-md py-sm border-b border-outline-variant">
          <h2 className="font-sans text-headline-sm text-on-surface">Authorized Staff</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Admin Name</th>
                <th>Email Address</th>
                <th>Assigned Role</th>
                <th>Registered Date</th>
                <th>Account Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-lg text-on-surface-variant">
                    {loading ? 'Loading administrators...' : 'No administrators registered yet.'}
                  </td>
                </tr>
              ) : (
                admins.map(admin => (
                  <tr key={admin._id}>
                    <td>
                      <div className="flex items-center gap-sm">
                        <div className="h-8 w-8 rounded-full bg-secondary-container flex items-center justify-center font-bold text-label-sm text-white">
                          {admin.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-on-surface">{admin.name}</span>
                      </div>
                    </td>
                    <td className="text-on-surface-variant">{admin.email}</td>
                    <td>
                      <span className="chip bg-surface-container text-on-surface-variant">
                        {admin.role?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-on-surface-variant">
                      {new Date(admin.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={`chip ${admin.isActive ? 'chip-online' : 'chip-offline'}`}>
                        {admin.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="text-right">
                      {admin.role !== 'super_admin' && (
                        <button
                          onClick={() => handleDeleteAdmin(admin._id, admin.name)}
                          className="text-on-surface-variant hover:text-error transition-colors p-1"
                          title="Revoke Admin Access"
                        >
                          <span className="material-symbols-outlined text-[20px]">person_remove</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
