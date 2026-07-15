'use client';

import { useState, useEffect } from 'react';

export default function KeywordSelectionModal({ keywords, domain, onClose, onSave, loading }) {
  const [selected, setSelected] = useState(new Set(keywords.map((_, i) => i)));
  const [sortCol, setSortCol] = useState('position');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    setSelected(new Set(keywords.map((_, i) => i)));
  }, [keywords]);

  const toggleAll = () => {
    if (selected.size === keywords.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(keywords.map((_, i) => i)));
    }
  };

  const toggleOne = (index) => {
    const next = new Set(selected);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelected(next);
  };

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const sortedKeywords = [...keywords].sort((a, b) => {
    let va = a[sortCol];
    let vb = b[sortCol];
    if (sortCol === 'keyword') {
      va = String(va).toLowerCase();
      vb = String(vb).toLowerCase();
    } else {
      va = va === '-' ? 9999 : Number(va) || 0;
      vb = vb === '-' ? 9999 : Number(vb) || 0;
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSave = () => {
    const selectedKeywords = sortedKeywords.filter((_, i) => selected.has(i));
    onSave(selectedKeywords);
  };

  const sortArrow = (col) => {
    if (sortCol !== col) return ' ↕';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1001,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
      }} onClick={onClose} />
      <div style={{
        position: 'relative',
        width: 640,
        maxWidth: '90vw',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-background-primary)',
        borderRadius: 'var(--border-radius-xl)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '0.5px solid var(--color-border-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px', color: 'var(--color-text-primary)' }}>
              Choose keywords to track
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
              We found {keywords.length} keywords {domain} ranks for.
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
            color: 'var(--color-text-secondary)', lineHeight: 1, padding: 0,
          }}>
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                <th style={{ padding: '10px 0', width: 36 }}>
                  <input
                    type="checkbox"
                    checked={selected.size === keywords.length && keywords.length > 0}
                    onChange={toggleAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('keyword')}>
                  KEYWORD{sortArrow('keyword')}
                </th>
                <th style={{ ...thStyle, textAlign: 'center', cursor: 'pointer', width: 80 }} onClick={() => handleSort('position')}>
                  POSITION{sortArrow('position')}
                </th>
                <th style={{ ...thStyle, textAlign: 'right', cursor: 'pointer', width: 80 }} onClick={() => handleSort('volume')}>
                  VOLUME{sortArrow('volume')}
                </th>
                <th style={{ ...thStyle, textAlign: 'right', cursor: 'pointer', width: 80 }} onClick={() => handleSort('traffic')}>
                  TRAFFIC{sortArrow('traffic')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedKeywords.map((kw, i) => (
                <tr key={i} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <td style={{ padding: '8px 0' }}>
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggleOne(i)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '8px 4px', color: 'var(--color-text-primary)' }}>
                    {kw.keyword}
                  </td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', color: 'var(--color-text-primary)' }}>
                    {kw.position}
                  </td>
                  <td style={{ padding: '8px 4px', textAlign: 'right', color: 'var(--color-text-primary)' }}>
                    {kw.volume?.toLocaleString?.() || kw.volume || 0}
                  </td>
                  <td style={{ padding: '8px 4px', textAlign: 'right', color: 'var(--color-text-primary)' }}>
                    {kw.traffic?.toLocaleString?.() || kw.traffic || 0}
                  </td>
                </tr>
              ))}
              {keywords.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                    No keywords found. Try a different domain or settings.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{
          padding: '16px 24px',
          borderTop: '0.5px solid var(--color-border-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {selected.size} of {keywords.length} selected
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 500,
                background: 'transparent', color: 'var(--color-text-secondary)',
                border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)',
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
            <button
              onClick={handleSave}
              disabled={loading || selected.size === 0}
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 500,
                background: loading ? 'var(--color-border-tertiary)' : 'var(--color-blue-600)',
                color: loading ? 'var(--color-text-tertiary)' : '#fff',
                border: 'none', borderRadius: 'var(--border-radius-md)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => { if (!loading) e.target.style.background = 'var(--color-blue-800)'; }}
              onMouseLeave={(e) => { if (!loading) e.target.style.background = 'var(--color-blue-600)'; }}
            >
              {loading ? 'Saving...' : 'Save Keywords'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  padding: '10px 4px',
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
  textAlign: 'left',
  userSelect: 'none',
};
