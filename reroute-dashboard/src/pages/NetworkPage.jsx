import React, { useState, useEffect } from 'react';
import api from '../api';

export default function NetworkPage() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    ip: '',
    type: 'access_point',
    status: 'Online',
    load: 10,
  });

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/network/nodes');
      setNodes(res.data.nodes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (node) => {
    const nextStatus = node.status === 'Online' ? 'Offline' : 'Online';
    try {
      const res = await api.patch(`/network/nodes/${node._id}/status`, {
        status: nextStatus,
        load: nextStatus === 'Offline' ? 0 : 45
      });
      setNodes(nodes.map(n => n._id === node._id ? res.data.node : n));
    } catch (err) {
      alert('Failed to update node status');
    }
  };

  const handleCreateNode = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/network/nodes', formData);
      setNodes([res.data.node, ...nodes]);
      setShowModal(false);
      setFormData({ name: '', location: '', ip: '', type: 'access_point', status: 'Online', load: 10 });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create network device.');
    }
  };

  const handleDeleteNode = async (id) => {
    if (!window.confirm('Delete this network device?')) return;
    try {
      await api.delete(`/network/nodes/${id}`);
      setNodes(nodes.filter(n => n._id !== id));
    } catch (err) {
      alert('Failed to delete node.');
    }
  };

  const getLoadColor = (load) => {
    if (load >= 80) return 'bg-error';
    if (load >= 60) return 'bg-yellow-400';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
        <div>
          <h1 className="font-sans text-headline-md text-on-surface">Campus Network Infrastructure</h1>
          <p className="font-sans text-body-md text-on-surface-variant mt-1">
            Access point routers, core switches, and gateway devices
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-xs px-sm py-xs bg-secondary text-on-secondary font-sans text-label-md font-semibold rounded-lg hover:bg-on-secondary-fixed-variant transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span>
          Register Device
        </button>
      </div>

      {/* Grid of Devices */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
        {nodes.map(node => (
          <div key={node._id} className="stat-card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-xs">
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    node.status === 'Online'
                      ? 'bg-green-100 text-green-700'
                      : node.status === 'Offline'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                    {node.status === 'Online' ? 'wifi' : node.status === 'Offline' ? 'wifi_off' : 'wifi_find'}
                  </span>
                </div>
                <div>
                  <p className="font-sans text-body-md font-semibold text-on-surface">{node.name}</p>
                  <p className="font-sans text-label-md text-on-surface-variant">{node.location}</p>
                </div>
              </div>
              <span className={`chip chip-${(node.status || 'pending').toLowerCase()}`}>{node.status}</span>
            </div>

            <div className="h-px bg-outline-variant my-1" />

            <div className="space-y-xs text-body-md">
              <div className="flex justify-between">
                <span className="text-on-surface-variant font-sans text-label-md">IP Address</span>
                <span className="font-mono">{node.ip}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant font-sans text-label-md">Hardware Type</span>
                <span className="capitalize">{node.type?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant font-sans text-label-md">Uptime</span>
                <span>{node.uptime || '99.9%'}</span>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-on-surface-variant font-sans text-label-md">Current Load</span>
                  <span className="font-sans text-label-md font-semibold">{node.load}%</span>
                </div>
                <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${getLoadColor(node.load)}`}
                    style={{ width: `${node.load}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-sm mt-xs border-t border-outline-variant">
              <button
                onClick={() => handleToggleStatus(node)}
                className="text-label-md text-secondary hover:underline font-medium"
              >
                Toggle {node.status === 'Online' ? 'Offline' : 'Online'}
              </button>
              <button
                onClick={() => handleDeleteNode(node._id)}
                className="text-on-surface-variant hover:text-error"
                title="Delete device"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal to Register Device */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-md z-50">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg max-w-md w-full shadow-2xl space-y-md">
            <h2 className="text-headline-sm font-semibold">Register Campus Network Device</h2>
            <form onSubmit={handleCreateNode} className="space-y-sm">
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1">Device Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. CS Lab AP 03"
                  className="w-full px-sm py-xs border rounded-lg border-outline-variant bg-surface-container-lowest"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1">Campus Location</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Science Bldg 3F"
                  className="w-full px-sm py-xs border rounded-lg border-outline-variant bg-surface-container-lowest"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1">Static IP Address</label>
                <input
                  required
                  type="text"
                  placeholder="192.168.1.120"
                  className="w-full px-sm py-xs border rounded-lg border-outline-variant bg-surface-container-lowest font-mono"
                  value={formData.ip}
                  onChange={e => setFormData({ ...formData, ip: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1">Device Type</label>
                <select
                  className="w-full px-sm py-xs border rounded-lg border-outline-variant bg-surface-container-lowest"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="access_point">Access Point (Wi-Fi)</option>
                  <option value="switch">Managed Switch</option>
                  <option value="gateway">Core Gateway</option>
                  <option value="router">Border Router</option>
                </select>
              </div>
              <div className="flex justify-end gap-sm pt-md">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-sm py-xs border rounded-lg hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-sm py-xs bg-secondary text-on-secondary rounded-lg font-semibold"
                >
                  Add Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
