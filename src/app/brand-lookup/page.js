'use client';

import { useState, useRef, useEffect } from 'react';
import PreviousAudits from '@/components/PreviousAudits';

const COUNTRIES = [
  { code: 'us', name: 'United States' },
  { code: 'uk', name: 'United Kingdom' },
  { code: 'de', name: 'Germany' },
  { code: 'fr', name: 'France' },
  { code: 'ca', name: 'Canada' },
  { code: 'au', name: 'Australia' },
  { code: 'jp', name: 'Japan' },
  { code: 'cn', name: 'China' },
  { code: 'in', name: 'India' },
  { code: 'br', name: 'Brazil' },
  { code: 'es', name: 'Spain' },
  { code: 'it', name: 'Italy' },
  { code: 'nl', name: 'Netherlands' },
  { code: 'se', name: 'Sweden' },
  { code: 'pl', name: 'Poland' },
  { code: 'mx', name: 'Mexico' },
  { code: 'kr', name: 'South Korea' },
  { code: 'sg', name: 'Singapore' },
  { code: 'world', name: 'World' },
];

const PLATFORMS = [
  { code: 'both', name: 'Both' },
  { code: 'chat_gpt', name: 'ChatGPT' },
  { code: 'google', name: 'Google AI Overview' },
];

function sortData(data, sortKey, sortDir) {
  if (!sortKey) return data;
  return [...data].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortDir === 'asc' ? av - bv : bv - av;
    }
    const as = String(av || '').toLowerCase();
    const bs = String(bv || '').toLowerCase();
    return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
  });
}

function formatNumber(n) {
  if (n === undefined || n === null) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function platformLabel(p) {
  if (p === 'chat_gpt') return 'ChatGPT';
  if (p === 'google') return 'Google AI';
  return p || '-';
}

function platformColor(p) {
  if (p === 'chat_gpt') return '#10a37f';
  if (p === 'google') return '#4285f4';
  return 'var(--color-text-tertiary)';
}

function extractDomain(url) {
  if (!url) return '';
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function TrendChart({ data, width, height }) {
  if (!data || data.length === 0) return null;
  const padding = 40;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const allValues = data.map((d) => d.mentions || 0);
  const maxVal = Math.max(...allValues, 1);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;

  const xScale = (i) => padding + (i / Math.max(data.length - 1, 1)) * chartW;
  const yScale = (v) => padding + chartH - ((v - minVal) / range) * chartH;

  const getPath = (key) => {
    return data
      .map((d, i) => {
        const x = xScale(i);
        const y = yScale(d[key] || 0);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const yTicks = 5;
  const step = Math.max(1, Math.floor(data.length / 8));

  return (
    <svg width={width} height={height} style={{ fontFamily: 'var(--font-sans)', fontSize: 10 }}>
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = padding + (chartH / yTicks) * i;
        const val = Math.round(maxVal - (range / yTicks) * i);
        return (
          <g key={i}>
            <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e8eaed" strokeWidth={0.5} />
            <text x={padding - 6} y={y + 3} textAnchor="end" fill="var(--color-text-tertiary)" fontSize={10}>
              {val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        if (i % step !== 0 && i !== data.length - 1) return null;
        const x = xScale(i);
        return (
          <text key={i} x={x} y={height - 8} textAnchor="middle" fill="var(--color-text-tertiary)" fontSize={10}>
            {d.label}
          </text>
        );
      })}
      <path d={getPath('mentions')} fill="none" stroke="#3b82f6" strokeWidth={2} />
      <path d={getPath('aiSearchVolume')} fill="none" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 2" />
      <g transform={`translate(${padding + 10}, ${padding - 18})`}>
        <g transform="translate(0, 0)">
          <line x1={0} y1={0} x2={14} y2={0} stroke="#3b82f6" strokeWidth={2} />
          <text x={18} y={3} fill="var(--color-text-secondary)" fontSize={10}>Mentions</text>
        </g>
        <g transform="translate(90, 0)">
          <line x1={0} y1={0} x2={14} y2={0} stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 2" />
          <text x={18} y={3} fill="var(--color-text-secondary)" fontSize={10}>AI Search Volume</text>
        </g>
      </g>
    </svg>
  );
}

export default function BrandLookupPage() {
  const [target, setTarget] = useState('');
  const [platform, setPlatform] = useState('both');
  const [country, setCountry] = useState('us');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('mentions');
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  const [filters, setFilters] = useState({
    include: '',
    exclude: '',
    mentionsMin: '',
    mentionsMax: '',
    volumeMin: '',
    volumeMax: '',
    platform: 'all',
  });

  const [appliedFilters, setAppliedFilters] = useState({});

  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('seo-brand-lookup-history');
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load brand lookup history:', e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('seo-brand-lookup-history', JSON.stringify(history));
  }, [history]);

  const loadHistory = (record) => {
    setData(record.results);
    setTarget(record.target || '');
    setPlatform(record.platform || 'both');
    setCountry(record.country || 'us');
    setAppliedFilters({});
    setShowFilters(false);
    setSortKey('');
    setSortDir('desc');
    setError(null);
  };

  const deleteHistory = (id) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const clearHistory = () => {
    if (typeof window !== 'undefined' && window.confirm('Clear all brand lookup history?')) {
      setHistory([]);
    }
  };

  useEffect(() => {
    function handleClick(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = async () => {
    if (!target.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/brand-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: target.trim(), platform, country }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request failed');
      setData(json);

      const record = {
        id: `bl-${Date.now()}`,
        target: target.trim(),
        date: new Date().toISOString(),
        status: 'done',
        platform,
        country,
        results: json,
      };
      setHistory((prev) => [record, ...prev].slice(0, 20));

      setAppliedFilters({});
      setShowFilters(false);
      setSortKey('');
      setSortDir('desc');
    } catch (err) {
      setError(err.message || 'Failed to fetch brand lookup data');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
    setShowFilters(false);
  };

  const clearFilters = () => {
    const reset = {
      include: '',
      exclude: '',
      mentionsMin: '',
      mentionsMax: '',
      volumeMin: '',
      volumeMax: '',
      platform: 'all',
    };
    setFilters(reset);
    setAppliedFilters(reset);
    setShowFilters(false);
  };

  const activeFilterCount = Object.entries(appliedFilters).filter(([k, v]) => {
    if (k === 'platform' && v === 'all') return false;
    return v !== '' && v !== false;
  }).length;

  const getFilteredData = () => {
    if (!data) return [];
    let items = [];
    if (activeTab === 'mentions') items = data.mentions || [];
    else if (activeTab === 'top-pages') items = data.topPages || [];
    else items = data.topDomains || [];

    const f = appliedFilters;
    const includeTerms = (f.include || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const excludeTerms = (f.exclude || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

    items = items.filter((item) => {
      const text = JSON.stringify(item).toLowerCase();
      if (includeTerms.length > 0 && !includeTerms.some((t) => text.includes(t))) return false;
      if (excludeTerms.length > 0 && excludeTerms.some((t) => text.includes(t))) return false;

      if (f.mentionsMin !== '' && (item.mentions || item.aiSearchVolume || 0) < Number(f.mentionsMin)) return false;
      if (f.mentionsMax !== '' && (item.mentions || item.aiSearchVolume || 0) > Number(f.mentionsMax)) return false;

      if (activeTab === 'mentions') {
        if (f.volumeMin !== '' && (item.aiSearchVolume || 0) < Number(f.volumeMin)) return false;
        if (f.volumeMax !== '' && (item.aiSearchVolume || 0) > Number(f.volumeMax)) return false;
        if (f.platform !== 'all' && item.platform !== f.platform) return false;
      }

      if (activeTab !== 'mentions') {
        if (f.volumeMin !== '' && (item.aiSearchVolume || 0) < Number(f.volumeMin)) return false;
        if (f.volumeMax !== '' && (item.aiSearchVolume || 0) > Number(f.volumeMax)) return false;
      }

      return true;
    });

    return sortData(items, sortKey, sortDir);
  };

  const filteredData = getFilteredData();

  const handleExport = async (format) => {
    if (!filteredData.length) return;
    setExportOpen(false);
    try {
      const res = await fetch('/api/brand-lookup/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, type: activeTab, data: filteredData, target: data.target }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.target}-${activeTab}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + (err.message || 'Unknown error'));
    }
  };

  const renderSortArrow = (key) => {
    if (sortKey !== key) return <span style={{ color: 'var(--color-text-tertiary)', fontSize: 10, marginLeft: 4 }}>&#9660;</span>;
    return <span style={{ color: 'var(--color-text-info)', fontSize: 10, marginLeft: 4 }}>{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>;
  };

  const tabs = [
    { id: 'mentions', label: 'Mentions' },
    { id: 'top-pages', label: 'Top Pages' },
    { id: 'top-domains', label: 'Top Domains' },
  ];

  const tabDescriptions = {
    'mentions': 'View sample user questions where LLMs reference your brand or domain.',
    'top-pages': 'Spot the pages LLMs cite alongside you so you know who\u2019s competing for attention in AI answers.',
    'top-domains': 'See the unique domains that LLMs cite alongside your brand in AI-generated responses.',
  };

  return (
    <div>
      <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
        <h1 style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>Brand Lookup</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
          See how ChatGPT and Google Gemini AI Overview cite any brand or domain \u2014 total mentions, sample prompts where it appears, and the pages cited alongside it.
        </p>
      </div>

      {/* Search Form */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, maxWidth: 400 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Brand or Domain</label>
          <div style={{ display: 'flex', alignItems: 'center', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', padding: '0 12px', height: 36, background: 'var(--color-background-primary)' }}>
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13, marginRight: 6 }}>&#x1F50D;</span>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="example.com or brand name"
              style={{ border: 'none', outline: 'none', fontSize: 13, flex: 1, background: 'transparent', color: 'var(--color-text-primary)' }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Platform</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            style={{ padding: '0 12px', height: 36, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', cursor: 'pointer', minWidth: 160 }}
          >
            {PLATFORMS.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Country</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            style={{ padding: '0 12px', height: 36, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', cursor: 'pointer', minWidth: 140 }}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            padding: '0 24px',
            height: 36,
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 'var(--border-radius-md)',
            border: 'none',
            background: 'var(--color-text-info)',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fff5f5', border: '0.5px solid #ffcccc', borderRadius: 'var(--border-radius-md)', color: '#c53030', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Previous Audits */}
      <PreviousAudits
        title="Previous Audits"
        items={history}
        columns={[
          { key: 'target', label: 'Brand / Domain' },
          { key: 'platform', label: 'Platform' },
          { key: 'country', label: 'Country' },
        ]}
        onSelect={loadHistory}
        onDelete={deleteHistory}
        onClear={clearHistory}
      />

      {/* Overview Stats */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Mentions', value: data.overview?.totalMentions || 0 },
            { label: 'AI Search Volume', value: data.overview?.aiSearchVolume || 0 },
            { label: 'Source Domains', value: data.overview?.sourcesDomains || 0 },
            { label: 'Search Result Domains', value: data.overview?.searchResultsDomains || 0 },
          ].map((stat) => (
            <div key={stat.label} style={{ padding: '16px 12px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)' }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                {formatNumber(stat.value)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Trend Chart */}
      {data && data.history && data.history.length > 0 && (
        <div style={{ padding: 16, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>Track AI Visibility</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 12 }}>Estimated mentions in ChatGPT and Google AI Overview answers, month over month</div>
          <TrendChart data={data.history} width={900} height={220} />
        </div>
      )}

      {/* Feature descriptions above tabs */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
          <div style={{ padding: '14px 16px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>Track AI visibility</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>See estimated counts for ChatGPT and Google AI Overview answers that cite your brand, and watch the trend month over month.</div>
          </div>
          <div style={{ padding: '14px 16px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>See the prompts</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>View sample user questions where LLMs reference your brand or domain.</div>
          </div>
          <div style={{ padding: '14px 16px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>Map the competition</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Spot the pages LLMs cite alongside you so you know who\u2019s competing for attention in AI answers.</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {data && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 0, borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSortKey('');
                    setSortDir('desc');
                    setShowFilters(false);
                    setExportOpen(false);
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: activeTab === tab.id ? 500 : 400,
                    color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    borderBottom: activeTab === tab.id ? '2px solid var(--color-text-info)' : '2px solid transparent',
                    marginBottom: -1,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div ref={exportRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setExportOpen((o) => !o)}
                  style={{
                    padding: '6px 14px',
                    fontSize: 13,
                    fontWeight: 500,
                    border: '0.5px solid var(--color-border-tertiary)',
                    borderRadius: 'var(--border-radius-md)',
                    background: 'var(--color-background-primary)',
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  &#8595; Export <span style={{ fontSize: 10 }}>&#9660;</span>
                </button>
                {exportOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 4,
                    background: 'var(--color-background-primary)',
                    border: '0.5px solid var(--color-border-tertiary)',
                    borderRadius: 'var(--border-radius-md)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    zIndex: 10,
                    minWidth: 120,
                    padding: '4px 0',
                  }}>
                    <button onClick={() => handleExport('csv')} style={{ display: 'block', width: '100%', padding: '8px 16px', textAlign: 'left', border: 'none', background: 'transparent', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-primary)' }}>Export CSV</button>
                    <button onClick={() => handleExport('xlsx')} style={{ display: 'block', width: '100%', padding: '8px 16px', textAlign: 'left', border: 'none', background: 'transparent', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-primary)' }}>Export XLSX</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tab description */}
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
            {tabDescriptions[activeTab]}
          </div>

          {/* Filter Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button
              onClick={() => setShowFilters((s) => !s)}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 500,
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: 'var(--border-radius-md)',
                background: activeFilterCount > 0 ? 'var(--color-background-info)' : 'var(--color-background-primary)',
                color: activeFilterCount > 0 ? 'var(--color-text-info)' : 'var(--color-text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>&#9776;</span> Filters
              {activeFilterCount > 0 && (
                <span style={{ display: 'inline-flex', width: 16, height: 16, borderRadius: '50%', background: 'var(--color-text-info)', color: '#fff', fontSize: 10, alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>{activeFilterCount}</span>
              )}
            </button>
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
              {filteredData.length} results
            </span>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div style={{ padding: 16, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Refine table results</span>
                <button onClick={clearFilters} style={{ fontSize: 12, color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Clear all</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Contains</label>
                    <input type="text" value={filters.include} onChange={(e) => setFilters((f) => ({ ...f, include: e.target.value }))} placeholder="brand, keyword" style={{ width: '100%', padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Excludes</label>
                    <input type="text" value={filters.exclude} onChange={(e) => setFilters((f) => ({ ...f, exclude: e.target.value }))} placeholder="spam, competitor" style={{ width: '100%', padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: activeTab === 'mentions' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>
                      {activeTab === 'mentions' ? 'AI Search Volume' : 'Mentions'}
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input type="number" value={filters.mentionsMin} onChange={(e) => setFilters((f) => ({ ...f, mentionsMin: e.target.value }))} placeholder="Min" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                      <input type="number" value={filters.mentionsMax} onChange={(e) => setFilters((f) => ({ ...f, mentionsMax: e.target.value }))} placeholder="Max" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>
                      {activeTab === 'mentions' ? 'Volume' : 'AI Search Volume'}
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input type="number" value={filters.volumeMin} onChange={(e) => setFilters((f) => ({ ...f, volumeMin: e.target.value }))} placeholder="Min" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                      <input type="number" value={filters.volumeMax} onChange={(e) => setFilters((f) => ({ ...f, volumeMax: e.target.value }))} placeholder="Max" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                    </div>
                  </div>
                  {activeTab === 'mentions' && (
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' }}>Platform</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[
                          { v: 'all', l: 'All' },
                          { v: 'chat_gpt', l: 'ChatGPT' },
                          { v: 'google', l: 'Google' },
                        ].map((p) => (
                          <button
                            key={p.v}
                            onClick={() => setFilters((f) => ({ ...f, platform: p.v }))}
                            style={{
                              padding: '4px 10px',
                              fontSize: 12,
                              borderRadius: 'var(--border-radius-md)',
                              border: '0.5px solid var(--color-border-tertiary)',
                              background: filters.platform === p.v ? 'var(--color-background-secondary)' : 'var(--color-background-primary)',
                              color: filters.platform === p.v ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                              cursor: 'pointer',
                              fontWeight: filters.platform === p.v ? 500 : 400,
                            }}
                          >
                            {p.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button onClick={() => setShowFilters(false)} style={{ padding: '6px 14px', fontSize: 12, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Cancel</button>
                <button onClick={applyFilters} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 'var(--border-radius-md)', background: 'var(--color-text-info)', color: '#fff', cursor: 'pointer' }}>Apply filters</button>
              </div>
            </div>
          )}

          {/* Table */}
          <div style={{ overflowX: 'auto', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)' }}>
                  {activeTab === 'mentions' && (
                    <>
                      <Th onClick={() => handleSort('question')} sortKey={sortKey} colKey="question" sortDir={sortDir}>Question</Th>
                      <Th onClick={() => handleSort('platform')} sortKey={sortKey} colKey="platform" sortDir={sortDir}>Platform</Th>
                      <Th onClick={() => handleSort('aiSearchVolume')} sortKey={sortKey} colKey="aiSearchVolume" sortDir={sortDir}>AI Volume</Th>
                      <Th onClick={() => handleSort('sources')} sortKey={sortKey} colKey="sources" sortDir={sortDir}>Sources</Th>
                    </>
                  )}
                  {activeTab === 'top-pages' && (
                    <>
                      <Th onClick={() => handleSort('page')} sortKey={sortKey} colKey="page" sortDir={sortDir}>Page</Th>
                      <Th onClick={() => handleSort('domain')} sortKey={sortKey} colKey="domain" sortDir={sortDir}>Domain</Th>
                      <Th onClick={() => handleSort('mentions')} sortKey={sortKey} colKey="mentions" sortDir={sortDir}>Mentions</Th>
                      <Th onClick={() => handleSort('aiSearchVolume')} sortKey={sortKey} colKey="aiSearchVolume" sortDir={sortDir}>AI Volume</Th>
                    </>
                  )}
                  {activeTab === 'top-domains' && (
                    <>
                      <Th onClick={() => handleSort('domain')} sortKey={sortKey} colKey="domain" sortDir={sortDir}>Domain</Th>
                      <Th onClick={() => handleSort('mentions')} sortKey={sortKey} colKey="mentions" sortDir={sortDir}>Mentions</Th>
                      <Th onClick={() => handleSort('aiSearchVolume')} sortKey={sortKey} colKey="aiSearchVolume" sortDir={sortDir}>AI Volume</Th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'mentions' ? 4 : activeTab === 'top-pages' ? 4 : 3} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                      No data to display. {activeFilterCount > 0 ? 'Try adjusting your filters.' : 'Search for a brand or domain to get started.'}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                      {activeTab === 'mentions' && (
                        <>
                          <td style={{ padding: '10px 12px', verticalAlign: 'top', maxWidth: 400 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>{item.question || '(no question)'}</div>
                            {item.answer && (
                              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.4, maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                                {item.answer}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 12, verticalAlign: 'top' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 'var(--border-radius-md)',
                              fontSize: 11,
                              fontWeight: 500,
                              background: platformColor(item.platform) + '15',
                              color: platformColor(item.platform),
                            }}>
                              {platformLabel(item.platform)}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500, verticalAlign: 'top' }}>
                            {formatNumber(item.aiSearchVolume)}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--color-text-secondary)', verticalAlign: 'top' }}>
                            {(item.sources || []).slice(0, 3).map((s, i) => (
                              <div key={i} style={{ color: 'var(--color-text-info)', fontSize: 11, marginBottom: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {s}
                              </div>
                            ))}
                            {(item.sources || []).length > 3 && (
                              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>+{item.sources.length - 3} more</div>
                            )}
                            {(!item.sources || item.sources.length === 0) && <span style={{ color: 'var(--color-text-tertiary)' }}>-</span>}
                          </td>
                        </>
                      )}
                      {activeTab === 'top-pages' && (
                        <>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-info)', maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.page || '-'}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--color-text-secondary)' }}>{item.domain || '-'}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{formatNumber(item.mentions)}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-primary)' }}>{formatNumber(item.aiSearchVolume)}</td>
                        </>
                      )}
                      {activeTab === 'top-domains' && (
                        <>
                          <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500, color: 'var(--color-text-info)' }}>{item.domain || '-'}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{formatNumber(item.mentions)}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-primary)' }}>{formatNumber(item.aiSearchVolume)}</td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!data && !loading && (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14, border: '1px dashed var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-secondary)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>&#x1F9EE;</div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>Enter a brand or domain to analyze AI visibility</div>
          <div style={{ fontSize: 13 }}>Type a brand name or domain above and click Search to get started.</div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'inline-block', width: 24, height: 24, border: '2px solid var(--color-border-tertiary)', borderTopColor: 'var(--color-text-info)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
          Querying LLM mentions across ChatGPT and Google AI Overview...
        </div>
      )}
    </div>
  );
}

function Th({ children, onClick, sortKey, colKey, sortDir }) {
  const isActive = sortKey === colKey;
  return (
    <th
      onClick={onClick}
      style={{
        padding: '10px 12px',
        textAlign: 'left',
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {children}
        {onClick && (
          <span style={{ color: isActive ? 'var(--color-text-info)' : 'var(--color-text-tertiary)', fontSize: 8 }}>
            {isActive ? (sortDir === 'asc' ? '\u25B2' : '\u25BC') : '\u25BC'}
          </span>
        )}
      </span>
    </th>
  );
}
