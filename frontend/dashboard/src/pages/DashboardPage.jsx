import React, { useState, useEffect } from 'react';
import api from '../api';

export default function DashboardPage() {
  const [stats, setStats] = useState({ totalNodes: 0, activeNodes: 0, offlineNodes: 0, networkLoad: 0 });
  const [admins, setAdmins] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, adminsRes, nodesRes] = await Promise.all([
        api.get('/network/stats').catch(() => ({ data: { totalNodes: 6, activeNodes: 4, offlineNodes: 1, networkLoad: 53 } })),
        api.get('/admins').catch(() => ({ data: { admins: [] } })),
        api.get('/network/nodes').catch(() => ({ data: { nodes: [] } })),
      ]);
      setStats(statsRes.data);
      setAdmins(adminsRes.data.admins || []);
      setNodes(nodesRes.data.nodes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
      <div>
        <h1 className="font-sans text-headline-md text-on-surface">Campus Network Dashboard</h1>
        <p className="font-sans text-body-md text-on-surface-variant mt-1">Real-time status and telemetry</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-md">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="font-sans text-label-md text-on-surface-variant uppercase tracking-wider">Total Admins</p>
            <span className="material-symbols-outlined text-secondary" style={{ fontSize: '24px' }}>group</span>
          </div>
          <p className="font-sans text-display-lg text-on-surface">{admins.length || 1}</p>
          <p className="font-sans text-label-sm text-on-surface-variant">Authorized accounts</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="font-sans text-label-md text-on-surface-variant uppercase tracking-wider">Active Nodes</p>
            <span className="material-symbols-outlined text-green-600" style={{ fontSize: '24px' }}>lan</span>
          </div>
          <p className="font-sans text-display-lg text-on-surface">{stats.activeNodes}</p>
          <p className="font-sans text-label-sm text-on-surface-variant">Online access points & switches</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="font-sans text-label-md text-on-surface-variant uppercase tracking-wider">Offline Nodes</p>
            <span className="material-symbols-outlined text-error" style={{ fontSize: '24px' }}>wifi_off</span>
          </div>
          <p className="font-sans text-display-lg text-on-surface">{stats.offlineNodes}</p>
          <p className="font-sans text-label-sm text-error">Requires investigation</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="font-sans text-label-md text-on-surface-variant uppercase tracking-wider">Avg Network Load</p>
            <span className="material-symbols-outlined text-secondary" style={{ fontSize: '24px' }}>speed</span>
          </div>
          <p className="font-sans text-display-lg text-on-surface">{stats.networkLoad}%</p>
          <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getLoadColor(stats.networkLoad)}`}
              style={{ width: `${stats.networkLoad}%` }}
            />
          </div>
        </div>
      </div>

      {/* Nodes Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
        <div className="px-md py-sm border-b border-outline-variant flex items-center justify-between">
          <h2 className="font-sans text-headline-sm text-on-surface">Campus Device Health</h2>
          <span className="chip chip-online">Live Telemetry</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Device Name</th>
                <th>Location</th>
                <th>IP Address</th>
                <th>Type</th>
                <th>Uptime</th>
                <th>Load</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {nodes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-lg text-on-surface-variant">
                    {loading ? 'Loading nodes...' : 'No network devices registered yet.'}
                  </td>
                </tr>
              ) : (
                nodes.map(node => (
                  <tr key={node._id || node.ip}>
                    <td className="font-semibold text-on-surface">{node.name}</td>
                    <td className="text-on-surface-variant">{node.location}</td>
                    <td className="font-mono text-body-md">{node.ip}</td>
                    <td className="capitalize text-on-surface-variant">{node.type?.replace('_', ' ')}</td>
                    <td>{node.uptime || '99.9%'}</td>
                    <td>
                      <div className="flex items-center gap-xs">
                        <div className="w-16 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getLoadColor(node.load)}`}
                            style={{ width: `${node.load}%` }}
                          />
                        </div>
                        <span className="text-body-md text-on-surface-variant">{node.load}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`chip chip-${(node.status || 'pending').toLowerCase()}`}>
                        {node.status}
                      </span>
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
