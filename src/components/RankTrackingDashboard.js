'use client';

import { useState, useMemo, useRef, useEffect } from 'react';

const TIME_RANGES = [
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: 'All', value: 'all' },
];

export default function RankTrackingDashboard({
  domain,
  keywords,
  onBack,
  onCheck,
  onAddKeywords,
  checking,
}) {
  const [timeRange, setTimeRange] = useState('all');
  const [sortCol, setSortCol] = useState('position');
  const [sortDir, setSortDir] = useState('asc');
  const [selectedRows, setSelectedRows] = useState(new Set());

  // Filter state
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [include, setInclude] = useState('');
  const [exclude, setExclude] = useState('');
  const [posMin, setPosMin] = useState('');
  const [posMax, setPosMax] = useState('');
  const [volMin, setVolMin] = useState('');
  const [volMax, setVolMax] = useState('');

  // Export dropdown
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters = include || exclude || posMin || posMax || volMin || volMax;

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const sortArrow = (col) => {
    if (sortCol !== col) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  const filteredKeywords = useMemo(() => {
    return keywords.filter((k) => {
      const lowerKw = k.keyword.toLowerCase();
      if (include) {
        const terms = include.toLowerCase().split(',').map((t) => t.trim()).filter(Boolean);
        if (terms.length > 0 && !terms.some((t) => lowerKw.includes(t))) return false;
      }
      if (exclude) {
        const terms = exclude.toLowerCase().split(',').map((t) => t.trim()).filter(Boolean);
        if (terms.length > 0 && terms.some((t) => lowerKw.includes(t))) return false;
      }
      const pos = k.position === '-' ? null : Number(k.position);
      if (posMin !== '' && pos !== null && pos < Number(posMin)) return false;
      if (posMax !== '' && pos !== null && pos > Number(posMax)) return false;
      const vol = Number(k.volume) || 0;
      if (volMin !== '' && vol < Number(volMin)) return false;
      if (volMax !== '' && vol > Number(volMax)) return false;
      return true;
    });
  }, [keywords, include, exclude, posMin, posMax, volMin, volMax]);

  const sortedKeywords = useMemo(() => {
    return [...filteredKeywords].sort((a, b) => {
      let va = a[sortCol];
      let vb = b[sortCol];
      if (sortCol === 'keyword') {
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
      } else if (sortCol === 'position') {
        va = va === '-' ? 9999 : Number(va) || 9999;
        vb = vb === '-' ? 9999 : Number(vb) || 9999;
      } else if (sortCol === 'volume') {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      } else if (sortCol === 'change') {
        const getChange = (k) => {
          const prev = k.previousPosition === '-' ? 9999 : Number(k.previousPosition) || 9999;
          const curr = k.position === '-' ? 9999 : Number(k.position) || 9999;
          if (prev === 9999 && curr === 9999) return 0;
          if (prev === 9999) return -999;
          if (curr === 9999) return 999;
          return prev - curr;
        };
        va = getChange(a);
        vb = getChange(b);
      } else {
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredKeywords, sortCol, sortDir]);

  const clearFilters = () => {
    setInclude('');
    setExclude('');
    setPosMin('');
    setPosMax('');
    setVolMin('');
    setVolMax('');
  };

  // Position distribution (based on filtered results)
  const distribution = useMemo(() => {
    const dist = { top3: 0, top4to10: 0, top11to20: 0, notTop20: 0 };
    filteredKeywords.forEach((k) => {
      const pos = k.position === '-' ? 9999 : Number(k.position) || 9999;
      if (pos <= 3) dist.top3++;
      else if (pos <= 10) dist.top4to10++;
      else if (pos <= 20) dist.top11to20++;
      else dist.notTop20++;
    });
    return dist;
  }, [filteredKeywords]);

  const total = filteredKeywords.length || 1;
  const distPercent = {
    top3: ((distribution.top3 / total) * 100).toFixed(1),
    top4to10: ((distribution.top4to10 / total) * 100).toFixed(1),
    top11to20: ((distribution.top11to20 / total) * 100).toFixed(1),
    notTop20: ((distribution.notTop20 / total) * 100).toFixed(1),
  };

  const toggleRow = (index) => {
    const next = new Set(selectedRows);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedRows(next);
  };

  const toggleAll = () => {
    if (selectedRows.size === sortedKeywords.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(sortedKeywords.map((_, i) => i)));
    }
  };

  const formatChange = (kw) => {
    const prev = kw.previousPosition === '-' ? null : Number(kw.previousPosition);
    const curr = kw.position === '-' ? null : Number(kw.position);
    if (prev === null && curr === null) return <span style={{ color: 'var(--color-text-tertiary)' }}>-</span>;
    if (prev === null) return <span style={{ color: 'var(--color-green-600)' }}>New</span>;
    if (curr === null) return <span style={{ color: 'var(--color-red-600)' }}>Lost</span>;
    const diff = prev - curr;
    if (diff > 0) return <span style={{ color: 'var(--color-green-600)' }}>↑{diff}</span>;
    if (diff < 0) return <span style={{ color: 'var(--color-red-600)' }}>↓{Math.abs(diff)}</span>;
    return <span style={{ color: 'var(--color-text-tertiary)' }}>-</span>;
  };

  const deviceLabel = (device) => {
    if (device === 'desktop+mobile') return 'Desktop + Mobile';
    if (device === 'desktop') return 'Desktop';
    if (device === 'mobile') return 'Mobile';
    return device;
  };

  const scheduleLabel = (schedule) => {
    if (schedule === 'weekly') return 'Weekly';
    if (schedule === 'monthly') return 'Monthly';
    return 'Manual';
  };

  const countryLabel = (country) => {
    const map = {
      world: 'World', united_states: 'US', united_kingdom: 'UK', germany: 'DE',
      china: 'CN', france: 'FR', australia: 'AU', canada: 'CA', japan: 'JP',
      india: 'IN', brazil: 'BR', spain: 'ES', italy: 'IT', netherlands: 'NL',
      russia: 'RU', south_korea: 'KR', turkey: 'TR', poland: 'PL', sweden: 'SE',
      mexico: 'MX', indonesia: 'ID', south_africa: 'ZA',
    };
    return map[country] || country.toUpperCase();
  };

  const costPerCheck = (keywords.length * 0.002).toFixed(2);

  const handleExport = async (format) => {
    setExportOpen(false);
    const dataToExport = sortedKeywords;
    if (dataToExport.length === 0) return;

    try {
      const res = await fetch('/api/rank-tracking/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          keywords: dataToExport,
          domain: domain.domain,
        }),
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${domain.domain}-rank-tracking.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error:', e);
    }
  };

  const inputFilterStyle = {
    width: '100%',
    padding: '6px 8px',
    fontSize: 12,
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: 'var(--border-radius-md)',
    background: 'var(--color-background-primary)',
    color: 'var(--color-text-primary)',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{
            fontSize: 12, color: 'var(--color-blue-600)', background: 'none', border: 'none',
            cursor: 'pointer', padding: 0, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          ← Back to domains
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text-primary)' }}>
          Rank Tracking
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
          Track keyword positions across domains
        </p>
      </div>

      {/* Domain info bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text-primary)' }}>
            {domain.domain}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>
            {countryLabel(domain.country)} · {deviceLabel(domain.device)} · {scheduleLabel(domain.schedule)} · ~${costPerCheck}/check
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            display: 'flex', border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 'var(--border-radius-md)', overflow: 'hidden',
          }}>
            {TIME_RANGES.map((tr) => (
              <button
                key={tr.value}
                onClick={() => setTimeRange(tr.value)}
                style={{
                  padding: '5px 12px', fontSize: 11, fontWeight: 500, border: 'none',
                  background: timeRange === tr.value ? 'var(--color-blue-600)' : 'var(--color-background-primary)',
                  color: timeRange === tr.value ? '#fff' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {tr.label}
              </button>
            ))}
          </div>
          <button
            onClick={onCheck}
            disabled={checking}
            style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 500,
              background: checking ? 'var(--color-border-tertiary)' : 'var(--color-blue-600)',
              color: checking ? 'var(--color-text-tertiary)' : '#fff',
              border: 'none', borderRadius: 'var(--border-radius-md)',
              cursor: checking ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => { if (!checking) e.target.style.background = 'var(--color-blue-800)'; }}
            onMouseLeave={(e) => { if (!checking) e.target.style.background = 'var(--color-blue-600)'; }}
          >
            {checking ? 'Checking...' : 'Check Now'}
          </button>
          <button
            onClick={onAddKeywords}
            style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 500,
              background: 'var(--color-blue-600)', color: '#fff',
              border: 'none', borderRadius: 'var(--border-radius-md)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.target.style.background = 'var(--color-blue-800)'}
            onMouseLeave={(e) => e.target.style.background = 'var(--color-blue-600)'}
          >
            + Add Keywords
          </button>
        </div>
      </div>

      {/* Position distribution */}
      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        padding: 20,
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>
            Position distribution
          </h3>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <DistItem color="#22c55e" label="Top 3" count={distribution.top3} percent={distPercent.top3} />
          <DistItem color="#3b82f6" label="4-10" count={distribution.top4to10} percent={distPercent.top4to10} />
          <DistItem color="#f59e0b" label="11-20" count={distribution.top11to20} percent={distPercent.top11to20} />
          <DistItem color="#9ca3af" label="Not in top 20" count={distribution.notTop20} percent={distPercent.notTop20} />
        </div>
        {keywords.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '20px 0', margin: 0 }}>
            No keywords tracked yet. Add keywords to see position distribution.
          </p>
        )}
      </div>

      {/* Keywords table with filters */}
      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        overflow: 'hidden',
      }}>
        {/* Toolbar */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '0.5px solid var(--color-border-tertiary)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setFilterPanelOpen(!filterPanelOpen)}
              style={{
                padding: '5px 12px', fontSize: 12, fontWeight: 500,
                background: hasActiveFilters ? 'var(--color-background-info)' : 'var(--color-background-primary)',
                color: 'var(--color-text-secondary)',
                border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              ≡ Filters {hasActiveFilters && <span style={{ color: 'var(--color-blue-600)', fontWeight: 600 }}>·</span>}
            </button>
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{filteredKeywords.length} keywords</span>
          </div>
          <div ref={exportRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setExportOpen(!exportOpen)}
              style={{
                padding: '5px 10px', fontSize: 12, fontWeight: 500,
                background: 'transparent', color: 'var(--color-text-secondary)',
                border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              ↓ Export <span style={{ fontSize: 10 }}>▾</span>
            </button>
            {exportOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4,
                background: 'var(--color-background-primary)',
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: 'var(--border-radius-md)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                zIndex: 50, minWidth: 120,
                overflow: 'hidden',
              }}>
                <button
                  onClick={() => handleExport('csv')}
                  style={{
                    width: '100%', padding: '8px 14px', fontSize: 12, textAlign: 'left',
                    background: 'transparent', color: 'var(--color-text-primary)', border: 'none',
                    cursor: 'pointer', display: 'block',
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'var(--color-background-secondary)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  Export CSV
                </button>
                <button
                  onClick={() => handleExport('xlsx')}
                  style={{
                    width: '100%', padding: '8px 14px', fontSize: 12, textAlign: 'left',
                    background: 'transparent', color: 'var(--color-text-primary)', border: 'none',
                    cursor: 'pointer', display: 'block',
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'var(--color-background-secondary)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  Export XLSX
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {filterPanelOpen && (
          <div style={{
            padding: '16px 16px 4px',
            borderBottom: '0.5px solid var(--color-border-tertiary)',
            background: 'var(--color-background-secondary)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>Refine results</h4>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  style={{
                    fontSize: 11, color: 'var(--color-text-secondary)', background: 'none', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  🗑 Clear all
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ ...filterLabelStyle }}>INCLUDE</label>
                <input
                  type="text"
                  value={include}
                  onChange={(e) => setInclude(e.target.value)}
                  placeholder="e.g. seo, tool"
                  style={inputFilterStyle}
                />
              </div>
              <div>
                <label style={{ ...filterLabelStyle }}>EXCLUDE</label>
                <input
                  type="text"
                  value={exclude}
                  onChange={(e) => setExclude(e.target.value)}
                  placeholder="e.g. free, cheap"
                  style={inputFilterStyle}
                />
              </div>
              <div>
                <label style={{ ...filterLabelStyle }}>POSITION</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="number"
                    value={posMin}
                    onChange={(e) => setPosMin(e.target.value)}
                    placeholder="Min"
                    min={1}
                    style={{ ...inputFilterStyle, flex: 1 }}
                  />
                  <input
                    type="number"
                    value={posMax}
                    onChange={(e) => setPosMax(e.target.value)}
                    placeholder="Max"
                    min={1}
                    style={{ ...inputFilterStyle, flex: 1 }}
                  />
                </div>
              </div>
              <div>
                <label style={{ ...filterLabelStyle }}>VOLUME</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="number"
                    value={volMin}
                    onChange={(e) => setVolMin(e.target.value)}
                    placeholder="Min"
                    min={0}
                    style={{ ...inputFilterStyle, flex: 1 }}
                  />
                  <input
                    type="number"
                    value={volMax}
                    onChange={(e) => setVolMax(e.target.value)}
                    placeholder="Max"
                    min={0}
                    style={{ ...inputFilterStyle, flex: 1 }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                <th style={{ padding: '10px 12px', width: 36 }}>
                  <input type="checkbox" checked={selectedRows.size === sortedKeywords.length && sortedKeywords.length > 0} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                </th>
                <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('keyword')}>KEYWORD{sortArrow('keyword')}</th>
                <th style={{ ...thStyle, textAlign: 'center', cursor: 'pointer', width: 80 }} onClick={() => handleSort('position')}>POSITION{sortArrow('position')}</th>
                <th style={{ ...thStyle, cursor: 'pointer', width: 120 }} onClick={() => handleSort('url')}>URL{sortArrow('url')}</th>
                <th style={{ ...thStyle, textAlign: 'right', cursor: 'pointer', width: 80 }} onClick={() => handleSort('volume')}>VOLUME{sortArrow('volume')}</th>
                <th style={{ ...thStyle, textAlign: 'center', cursor: 'pointer', width: 80 }} onClick={() => handleSort('change')}>CHANGE{sortArrow('change')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedKeywords.map((kw, i) => (
                <tr key={kw.id || i} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <input type="checkbox" checked={selectedRows.has(i)} onChange={() => toggleRow(i)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={{ padding: '8px 4px', color: 'var(--color-text-primary)', fontWeight: 500 }}>{kw.keyword}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', color: 'var(--color-text-primary)' }}>
                    {kw.position === '-' ? (
                      <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>
                    ) : (
                      kw.position
                    )}
                  </td>
                  <td style={{ padding: '8px 4px', color: 'var(--color-text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {kw.url ? (
                      <a href={kw.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-blue-600)', textDecoration: 'none' }}>
                        {kw.url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '8px 4px', textAlign: 'right', color: 'var(--color-text-primary)' }}>
                    {kw.volume?.toLocaleString?.() || kw.volume || 0}
                  </td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 500 }}>
                    {formatChange(kw)}
                  </td>
                </tr>
              ))}
              {keywords.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                    No keywords tracked yet. Click "+ Add Keywords" to start tracking.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{
          padding: '10px 16px',
          borderTop: '0.5px solid var(--color-border-tertiary)',
          fontSize: 12,
          color: 'var(--color-text-tertiary)',
        }}>
          {filteredKeywords.length} of {keywords.length} keywords
        </div>
      </div>
    </div>
  );
}

function DistItem({ color, label, count, percent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
      <div>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {count} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-tertiary)' }}>({percent}%)</span>
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

const filterLabelStyle = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--color-text-tertiary)',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
};
