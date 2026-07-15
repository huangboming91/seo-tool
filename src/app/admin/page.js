'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

const MODULE_LABELS = {
  keyword_research: 'Keyword Research',
  rank_tracking: 'Rank Tracking',
  domain_overview: 'Domain Overview',
  brand_lookup: 'Brand Lookup',
  backlinks: 'Backlinks',
  site_audit: 'Site Audits',
};

const MODULE_WEIGHTS = {
  keyword_research: 1,
  rank_tracking: 1,
  domain_overview: 2,
  brand_lookup: 2,
  backlinks: 3,
  site_audit: 5,
};

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setFetchLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      setUsers([]);
    } finally {
      setFetchLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/audit-logs?limit=30');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
      setLogs([]);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'admin') {
        router.push('/login');
        return;
      }
      fetchUsers();
      fetchLogs();
    }
  }, [user, loading, router, fetchUsers, fetchLogs]);

  if (loading || (!user && !loading)) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Loading...</div>;
  }

  if (user?.role !== 'admin') {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Redirecting...</div>;
  }

  // Stats
  const activeUsers = users.filter((u) => u.status === 'active').length;
  const totalUsedToday = users.reduce((sum, u) => sum + (u.used_today || 0), 0);
  const totalQuota = users.reduce((sum, u) => sum + (u.daily_limit || 0), 0);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
          Admin Panel
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          Manage sub-accounts, permissions, and quotas
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Sub-Accounts" value={users.length} />
        <StatCard label="Active" value={activeUsers} color="var(--color-text-success)" />
        <StatCard label="Quota Used Today" value={totalUsedToday} color="var(--color-text-warning)" />
        <StatCard label="Total Daily Quota" value={totalQuota} color="var(--color-text-info)" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '0.5px solid var(--color-border-tertiary)', marginBottom: 16 }}>
        <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>
          Sub-Accounts
        </TabButton>
        <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')}>
          Audit Logs
        </TabButton>
      </div>

      {activeTab === 'users' && (
        <div>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '6px 14px',
                background: 'var(--color-blue-800)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--border-radius-md)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              + Create Sub-Account
            </button>
          </div>

          {fetchLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>Loading...</div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>
              No sub-accounts yet. Click &quot;Create Sub-Account&quot; to add one.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Status</Th>
                  <Th>Data Scope</Th>
                  <Th>Daily Limit</Th>
                  <Th>Used Today</Th>
                  <Th>Remaining</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                    <Td>{u.display_name}</Td>
                    <Td style={{ color: 'var(--color-text-tertiary)' }}>{u.email}</Td>
                    <Td>
                      <StatusBadge status={u.status} />
                    </Td>
                    <Td style={{ color: 'var(--color-text-tertiary)' }}>{u.data_scope}</Td>
                    <Td>{u.daily_limit}</Td>
                    <Td style={{ color: u.used_today > 0 ? 'var(--color-text-warning)' : 'var(--color-text-tertiary)' }}>
                      {u.used_today}
                    </Td>
                    <Td style={{ color: u.remaining > 0 ? 'var(--color-text-success)' : 'var(--color-text-danger)' }}>
                      {u.remaining}
                    </Td>
                    <Td>
                      <button
                        onClick={() => setEditingUser(u)}
                        style={{
                          fontSize: 11,
                          color: 'var(--color-text-info)',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          padding: '2px 6px',
                          marginRight: 8,
                        }}
                      >
                        Edit
                      </button>
                      <DeleteButton userId={u.id} userName={u.display_name} onDeleted={fetchUsers} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div>
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>
              No audit logs yet.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <Th>Time</Th>
                  <Th>User</Th>
                  <Th>Module</Th>
                  <Th>Action</Th>
                  <Th>Quota</Th>
                  <Th>Status</Th>
                  <Th>Detail</Th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                    <Td style={{ color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at + 'Z').toLocaleString('zh-CN', { hour12: false })}
                    </Td>
                    <Td style={{ color: 'var(--color-text-tertiary)' }}>{log.user_email || log.ip_address || '-'}</Td>
                    <Td>{log.module}</Td>
                    <Td>{log.action}</Td>
                    <Td>{log.quota_consumed || 0}</Td>
                    <Td>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: log.status === 'success' ? 'var(--color-background-success)' : 'var(--color-background-danger)',
                        color: log.status === 'success' ? 'var(--color-text-success)' : 'var(--color-text-danger)',
                      }}>
                        {log.status}
                      </span>
                    </Td>
                    <Td style={{ color: 'var(--color-text-tertiary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.detail || '-'}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); fetchUsers(); }}
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); fetchUsers(); }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-md)',
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: color || 'var(--color-text-primary)' }}>
        {value}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: active ? 500 : 400,
        color: active ? 'var(--color-text-info)' : 'var(--color-text-tertiary)',
        border: 'none',
        borderBottom: active ? '2px solid var(--color-blue-800)' : '2px solid transparent',
        background: 'transparent',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function Th({ children }) {
  return (
    <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {children}
    </th>
  );
}

function Td({ children, style }) {
  return <td style={{ padding: '8px 12px', ...style }}>{children}</td>;
}

function StatusBadge({ status }) {
  const colors = {
    active: { bg: 'var(--color-background-success)', text: 'var(--color-text-success)' },
    disabled: { bg: 'var(--color-background-danger)', text: 'var(--color-text-danger)' },
    expired: { bg: 'var(--color-background-warning)', text: 'var(--color-text-warning)' },
  };
  const c = colors[status] || colors.active;
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 500,
      padding: '2px 8px',
      borderRadius: 10,
      background: c.bg,
      color: c.text,
    }}>
      {status}
    </span>
  );
}

function DeleteButton({ userId, userName, onDeleted }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span style={{ display: 'inline-flex', gap: 4 }}>
        <button
          onClick={async () => {
            await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
            setConfirming(false);
            onDeleted();
          }}
          style={{ fontSize: 11, color: 'var(--color-text-danger)', border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 6px' }}
        >
          Yes
        </button>
        <button
          onClick={() => setConfirming(false)}
          style={{ fontSize: 11, color: 'var(--color-text-tertiary)', border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 6px' }}
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      style={{ fontSize: 11, color: 'var(--color-text-danger)', border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 6px' }}
    >
      Delete
    </button>
  );
}

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    display_name: '',
    daily_limit: 10,
    data_scope: 'self',
  });
  const [perms, setPerms] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Default: all modules accessible, can export, no batch
  useEffect(() => {
    const defaultPerms = {};
    for (const mod of Object.keys(MODULE_LABELS)) {
      defaultPerms[mod] = { can_access: true, can_export: true, can_batch: false };
    }
    setPerms(defaultPerms);
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, permissions: perms }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create user');
        return;
      }
      onCreated();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Create Sub-Account" onClose={onClose}>
      {error && <ErrorBox message={error} />}
      <FormField label="Display Name">
        <input type="text" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })}
          style={inputStyle} placeholder="John Doe" />
      </FormField>
      <FormField label="Email">
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          style={inputStyle} placeholder="user@example.com" />
      </FormField>
      <FormField label="Password">
        <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
          style={inputStyle} placeholder="Set initial password" />
      </FormField>
      <div style={{ display: 'flex', gap: 12 }}>
        <FormField label="Daily Quota Limit">
          <input type="number" value={form.daily_limit} onChange={(e) => setForm({ ...form, daily_limit: parseInt(e.target.value) || 10 })}
            style={inputStyle} min="1" />
        </FormField>
        <FormField label="Data Scope">
          <select value={form.data_scope} onChange={(e) => setForm({ ...form, data_scope: e.target.value })}
            style={inputStyle}>
            <option value="self">Self only</option>
            <option value="group">Group</option>
            <option value="all">All data</option>
          </select>
        </FormField>
      </div>

      <div style={{ marginTop: 16, marginBottom: 8, fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
        Module Permissions (4-Dimensional)
      </div>
      <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: 'var(--color-background-secondary)' }}>
              <th style={thStyle}>Module</th>
              <th style={thStyle}>Weight</th>
              <th style={thStyle}>Access</th>
              <th style={thStyle}>Export</th>
              <th style={thStyle}>Batch</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(MODULE_LABELS).map(([mod, label]) => (
              <tr key={mod} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                <td style={tdStyle}>{label}</td>
                <td style={{ ...tdStyle, color: 'var(--color-text-tertiary)' }}>{MODULE_WEIGHTS[mod]}</td>
                <td style={tdStyle}><Checkbox checked={perms[mod]?.can_access} onChange={(v) => setPerms({ ...perms, [mod]: { ...perms[mod], can_access: v } })} /></td>
                <td style={tdStyle}><Checkbox checked={perms[mod]?.can_export} onChange={(v) => setPerms({ ...perms, [mod]: { ...perms[mod], can_export: v } })} /></td>
                <td style={tdStyle}><Checkbox checked={perms[mod]?.can_batch} onChange={(v) => setPerms({ ...perms, [mod]: { ...perms[mod], can_batch: v } })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ModalActions onClose={onClose} onSubmit={handleSubmit} loading={loading} submitLabel="Create" />
    </ModalShell>
  );
}

function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    display_name: user.display_name,
    status: user.status,
    data_scope: user.data_scope,
    daily_limit: user.daily_limit || 10,
    password: '',
  });
  const [perms, setPerms] = useState(user.permissions || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const body = {
        display_name: form.display_name,
        status: form.status,
        data_scope: form.data_scope,
        daily_limit: form.daily_limit,
        permissions: perms,
      };
      if (form.password) body.password = form.password;

      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update user');
        return;
      }
      onSaved();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title={`Edit: ${user.display_name}`} onClose={onClose}>
      {error && <ErrorBox message={error} />}
      <FormField label="Display Name">
        <input type="text" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })}
          style={inputStyle} />
      </FormField>
      <FormField label="Reset Password (leave empty to keep current)">
        <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
          style={inputStyle} placeholder="••••••••" />
      </FormField>
      <div style={{ display: 'flex', gap: 12 }}>
        <FormField label="Status">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
            style={inputStyle}>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="expired">Expired</option>
          </select>
        </FormField>
        <FormField label="Daily Quota Limit">
          <input type="number" value={form.daily_limit} onChange={(e) => setForm({ ...form, daily_limit: parseInt(e.target.value) || 10 })}
            style={inputStyle} min="1" />
        </FormField>
        <FormField label="Data Scope">
          <select value={form.data_scope} onChange={(e) => setForm({ ...form, data_scope: e.target.value })}
            style={inputStyle}>
            <option value="self">Self only</option>
            <option value="group">Group</option>
            <option value="all">All data</option>
          </select>
        </FormField>
      </div>

      <div style={{ marginTop: 16, marginBottom: 8, fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
        Module Permissions (4-Dimensional)
      </div>
      <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: 'var(--color-background-secondary)' }}>
              <th style={thStyle}>Module</th>
              <th style={thStyle}>Weight</th>
              <th style={thStyle}>Access</th>
              <th style={thStyle}>Export</th>
              <th style={thStyle}>Batch</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(MODULE_LABELS).map(([mod, label]) => (
              <tr key={mod} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                <td style={tdStyle}>{label}</td>
                <td style={{ ...tdStyle, color: 'var(--color-text-tertiary)' }}>{MODULE_WEIGHTS[mod]}</td>
                <td style={tdStyle}><Checkbox checked={perms[mod]?.can_access ?? true} onChange={(v) => setPerms({ ...perms, [mod]: { ...perms[mod], can_access: v } })} /></td>
                <td style={tdStyle}><Checkbox checked={perms[mod]?.can_export ?? true} onChange={(v) => setPerms({ ...perms, [mod]: { ...perms[mod], can_export: v } })} /></td>
                <td style={tdStyle}><Checkbox checked={perms[mod]?.can_batch ?? false} onChange={(v) => setPerms({ ...perms, [mod]: { ...perms[mod], can_batch: v } })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Usage info */}
      <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', fontSize: 11, color: 'var(--color-text-tertiary)' }}>
        Used today: {user.used_today || 0} / {user.daily_limit || 0} | Remaining: {user.remaining || 0}
      </div>

      <ModalActions onClose={onClose} onSubmit={handleSubmit} loading={loading} submitLabel="Save Changes" />
    </ModalShell>
  );
}

// --- Shared UI Components ---

const inputStyle = {
  width: '100%',
  padding: '7px 10px',
  border: '0.5px solid var(--color-border-tertiary)',
  borderRadius: 'var(--border-radius-md)',
  fontSize: 12,
  outline: 'none',
};

const thStyle = {
  textAlign: 'left',
  padding: '6px 10px',
  fontSize: 10,
  fontWeight: 500,
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
};

const tdStyle = {
  padding: '6px 10px',
};

function ModalShell({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--color-background-primary)',
        borderRadius: 'var(--border-radius-lg)',
        width: 560,
        maxHeight: '85vh',
        overflowY: 'auto',
        padding: '24px 28px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: 'var(--color-text-tertiary)' }}>x</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

function ErrorBox({ message }) {
  return (
    <div style={{
      background: 'var(--color-background-danger)',
      color: 'var(--color-text-danger)',
      padding: '8px 12px',
      borderRadius: 'var(--border-radius-md)',
      fontSize: 12,
      marginBottom: 12,
    }}>{message}</div>
  );
}

function Checkbox({ checked, onChange }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{ cursor: 'pointer' }}
    />
  );
}

function ModalActions({ onClose, onSubmit, loading, submitLabel }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
      <button
        onClick={onClose}
        style={{
          padding: '7px 16px',
          fontSize: 12,
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 'var(--border-radius-md)',
          background: 'transparent',
          cursor: 'pointer',
          color: 'var(--color-text-secondary)',
        }}
      >
        Cancel
      </button>
      <button
        onClick={onSubmit}
        disabled={loading}
        style={{
          padding: '7px 16px',
          fontSize: 12,
          border: 'none',
          borderRadius: 'var(--border-radius-md)',
          background: loading ? 'var(--color-border-tertiary)' : 'var(--color-blue-800)',
          color: '#fff',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 500,
        }}
      >
        {loading ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}
