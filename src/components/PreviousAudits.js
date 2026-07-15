'use client';

import { useState } from 'react';

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function PreviousAudits({ title, items, columns, onSelect, onDelete, onClear, emptyText }) {
  const [confirmDelete, setConfirmDelete] = useState(null);

  if (!items || items.length === 0) return null;

  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      padding: 20,
      marginTop: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
        {onClear && (
          <button
            onClick={onClear}
            style={{
              fontSize: 11,
              color: 'var(--color-text-danger)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Clear all
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              <th style={thStyle}>Date</th>
              {columns.map((col) => (
                <th key={col.key} style={{ ...thStyle, textAlign: col.align || 'left' }}>{col.label}</th>
              ))}
              <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}
              >
                <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {formatDate(item.date)}
                </td>
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: '10px 12px', color: 'var(--color-text-primary)', textAlign: col.align || 'left' }}>
                    {col.render ? col.render(item[col.key], item) : item[col.key]}
                  </td>
                ))}
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <StatusBadge status={item.status} />
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                    <button
                      onClick={() => onSelect(item)}
                      style={{
                        padding: '4px 10px',
                        fontSize: 11,
                        color: 'var(--color-text-info)',
                        background: 'transparent',
                        border: '0.5px solid var(--color-border-tertiary)',
                        borderRadius: 'var(--border-radius-md)',
                        cursor: 'pointer',
                      }}
                    >
                      View
                    </button>
                    {confirmDelete === item.id ? (
                      <>
                        <button
                          onClick={() => { onDelete(item.id); setConfirmDelete(null); }}
                          style={{
                            padding: '4px 8px',
                            fontSize: 11,
                            color: '#fff',
                            background: 'var(--color-text-danger)',
                            border: 'none',
                            borderRadius: 'var(--border-radius-md)',
                            cursor: 'pointer',
                          }}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          style={{
                            padding: '4px 8px',
                            fontSize: 11,
                            color: 'var(--color-text-secondary)',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(item.id)}
                        style={{
                          padding: '4px 8px',
                          fontSize: 11,
                          color: 'var(--color-text-danger)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    done: { bg: 'var(--color-green-100)', color: 'var(--color-green-600)', label: 'Done' },
    completed: { bg: 'var(--color-green-100)', color: 'var(--color-green-600)', label: 'Done' },
    pending: { bg: 'var(--color-yellow-100)', color: 'var(--color-yellow-600)', label: 'Pending' },
    running: { bg: 'var(--color-blue-100)', color: 'var(--color-blue-600)', label: 'Running' },
    failed: { bg: 'var(--color-red-100)', color: 'var(--color-red-600)', label: 'Failed' },
  };
  const s = styles[status] || styles.pending;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 10px',
      borderRadius: 10,
      fontSize: 11,
      fontWeight: 500,
      background: s.bg,
      color: s.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
      {s.label}
    </span>
  );
}

const thStyle = {
  padding: '10px 12px',
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
  textAlign: 'left',
};
