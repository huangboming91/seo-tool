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
  { code: 'ru', name: 'Russia' },
  { code: 'kr', name: 'South Korea' },
  { code: 'sg', name: 'Singapore' },
  { code: 'world', name: 'World' },
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

function formatDate(str) {
  if (!str) return '-';
  try {
    return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return str;
  }
}

function LineChart({ data, lines, width, height }) {
  if (!data || data.length === 0) return null;
  const padding = 40;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const allValues = data.flatMap((d) => lines.map((l) => d[l.key] || 0));
  const maxVal = Math.max(...allValues, 1);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;

  const xScale = (i) => padding + (i / (data.length - 1)) * chartW;
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

  return (
    <svg width={width} height={height} style={{ fontFamily: 'var(--font-sans)', fontSize: 10 }}>
      {/* Y axis grid lines */}
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
      {/* X axis labels */}
      {data.map((d, i) => {
        const x = xScale(i);
        return (
          <text key={i} x={x} y={height - 8} textAnchor="middle" fill="var(--color-text-tertiary)" fontSize={10}>
            {d.label}
          </text>
        );
      })}
      {/* Lines */}
      {lines.map((l) => (
        <path key={l.key} d={getPath(l.key)} fill="none" stroke={l.color} strokeWidth={2} />
      ))}
      {/* Legend */}
      <g transform={`translate(${padding + 10}, ${padding - 18})`}>
        {lines.map((l, i) => (
          <g key={l.key} transform={`translate(${i * 90}, 0)`}>
            <line x1={0} y1={0} x2={14} y2={0} stroke={l.color} strokeWidth={2} />
            <text x={18} y={3} fill="var(--color-text-secondary)" fontSize={10}>{l.label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

export default function BacklinksPage() {
  const [domain, setDomain] = useState('');
  const [country, setCountry] = useState('us');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('backlinks');
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  // Filter state
  const [filters, setFilters] = useState({
    include: '',
    exclude: '',
    domainAuthorityMin: '',
    domainAuthorityMax: '',
    linkAuthorityMin: '',
    linkAuthorityMax: '',
    spamScoreMin: '',
    spamScoreMax: '',
    backlinksMin: '',
    backlinksMax: '',
    rankMin: '',
    rankMax: '',
    referringDomainsMin: '',
    referringDomainsMax: '',
    linkType: 'all', // all, dofollow, nofollow
    visibilityLost: false,
    visibilityBroken: false,
  });

  const [appliedFilters, setAppliedFilters] = useState({});

  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('seo-backlinks-history');
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load backlinks history:', e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('seo-backlinks-history', JSON.stringify(history));
  }, [history]);

  const loadHistory = (record) => {
    setData(record.results);
    setDomain(record.domain || '');
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
    if (typeof window !== 'undefined' && window.confirm('Clear all backlinks history?')) {
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
    if (!domain.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/backlinks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: domain.trim(), includeSubdomains: true, country }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request failed');
      setData(json);

      const record = {
        id: `bl-${Date.now()}`,
        target: domain.trim(),
        date: new Date().toISOString(),
        status: 'done',
        domain: domain.trim(),
        country,
        results: json,
      };
      setHistory((prev) => [record, ...prev].slice(0, 20));

      setAppliedFilters({});
      setShowFilters(false);
      setSortKey('');
      setSortDir('desc');
    } catch (err) {
      setError(err.message || 'Failed to fetch backlink data');
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
      domainAuthorityMin: '',
      domainAuthorityMax: '',
      linkAuthorityMin: '',
      linkAuthorityMax: '',
      spamScoreMin: '',
      spamScoreMax: '',
      backlinksMin: '',
      backlinksMax: '',
      rankMin: '',
      rankMax: '',
      referringDomainsMin: '',
      referringDomainsMax: '',
      linkType: 'all',
      visibilityLost: false,
      visibilityBroken: false,
    };
    setFilters(reset);
    setAppliedFilters(reset);
    setShowFilters(false);
  };

  const activeFilterCount = Object.entries(appliedFilters).filter(([k, v]) => {
    if (k === 'linkType' && v === 'all') return false;
    if (k === 'visibilityLost' || k === 'visibilityBroken') return v === true;
    return v !== '' && v !== false;
  }).length;

  const getFilteredData = () => {
    if (!data) return [];
    let items = [];
    if (activeTab === 'backlinks') items = data.backlinks || [];
    else if (activeTab === 'referring-domains') items = data.referringDomains || [];
    else items = data.topPages || [];

    const f = appliedFilters;

    // Include / Exclude terms
    const includeTerms = (f.include || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const excludeTerms = (f.exclude || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

    items = items.filter((item) => {
      const text = JSON.stringify(item).toLowerCase();
      if (includeTerms.length > 0 && !includeTerms.some((t) => text.includes(t))) return false;
      if (excludeTerms.length > 0 && excludeTerms.some((t) => text.includes(t))) return false;

      if (activeTab === 'backlinks') {
        if (f.domainAuthorityMin !== '' && (item.domainAuthority || 0) < Number(f.domainAuthorityMin)) return false;
        if (f.domainAuthorityMax !== '' && (item.domainAuthority || 0) > Number(f.domainAuthorityMax)) return false;
        if (f.linkAuthorityMin !== '' && (item.linkAuthority || 0) < Number(f.linkAuthorityMin)) return false;
        if (f.linkAuthorityMax !== '' && (item.linkAuthority || 0) > Number(f.linkAuthorityMax)) return false;
        if (f.spamScoreMin !== '' && (item.spamScore || 0) < Number(f.spamScoreMin)) return false;
        if (f.spamScoreMax !== '' && (item.spamScore || 0) > Number(f.spamScoreMax)) return false;
        if (f.linkType === 'dofollow' && !item.dofollow) return false;
        if (f.linkType === 'nofollow' && !item.nofollow) return false;
        if (f.visibilityLost && !item.lost) return false;
        if (f.visibilityBroken && !item.broken) return false;
      } else if (activeTab === 'referring-domains') {
        if (f.backlinksMin !== '' && (item.backlinks || 0) < Number(f.backlinksMin)) return false;
        if (f.backlinksMax !== '' && (item.backlinks || 0) > Number(f.backlinksMax)) return false;
        if (f.rankMin !== '' && (item.rank || 0) < Number(f.rankMin)) return false;
        if (f.rankMax !== '' && (item.rank || 0) > Number(f.rankMax)) return false;
        if (f.spamScoreMin !== '' && (item.spamScore || 0) < Number(f.spamScoreMin)) return false;
        if (f.spamScoreMax !== '' && (item.spamScore || 0) > Number(f.spamScoreMax)) return false;
      } else {
        if (f.backlinksMin !== '' && (item.backlinks || 0) < Number(f.backlinksMin)) return false;
        if (f.backlinksMax !== '' && (item.backlinks || 0) > Number(f.backlinksMax)) return false;
        if (f.referringDomainsMin !== '' && (item.referringDomains || 0) < Number(f.referringDomainsMin)) return false;
        if (f.referringDomainsMax !== '' && (item.referringDomains || 0) > Number(f.referringDomainsMax)) return false;
        if (f.rankMin !== '' && (item.rank || 0) < Number(f.rankMin)) return false;
        if (f.rankMax !== '' && (item.rank || 0) > Number(f.rankMax)) return false;
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
      const res = await fetch('/api/backlinks/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, type: activeTab, data: filteredData }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.domain}-${activeTab}.${format}`;
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
    return <span style={{ color: 'var(--color-text-info)', fontSize: 10, marginLeft: 4 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>;
  };

  const tabs = [
    { id: 'backlinks', label: 'Backlinks' },
    { id: 'referring-domains', label: 'Referring Domains' },
    { id: 'top-pages', label: 'Top Pages' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
        <h1 style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>Backlinks</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
          Understand who links to a site, what changed recently, and which pages attract links.
        </p>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-end' }}>
        <div style={{ flex: 1, maxWidth: 400 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target Domain</label>
          <div style={{ display: 'flex', alignItems: 'center', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', padding: '0 12px', height: 36, background: 'var(--color-background-primary)' }}>
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13, marginRight: 6 }}>&#x1F50D;</span>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              style={{ border: 'none', outline: 'none', fontSize: 13, flex: 1, background: 'transparent', color: 'var(--color-text-primary)' }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
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
          { key: 'target', label: 'Domain' },
          { key: 'country', label: 'Country' },
        ]}
        onSelect={loadHistory}
        onDelete={deleteHistory}
        onClear={clearHistory}
      />

      {/* Overview Stats */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Backlinks', value: data.overview?.backlinks || 0 },
            { label: 'Referring Domains', value: data.overview?.referringDomains || 0 },
            { label: 'Broken Backlinks', value: data.overview?.brokenBacklinks || 0 },
            { label: 'Broken Pages', value: data.overview?.brokenPages || 0 },
            { label: 'Spam Score', value: data.overview?.spamScore || 0 },
            { label: 'Dofollow Ratio', value: data.backlinks?.length ? Math.round((data.backlinks.filter((b) => b.dofollow).length / data.backlinks.length) * 100) : 0, suffix: '%' },
          ].map((stat) => (
            <div key={stat.label} style={{ padding: '16px 12px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                {stat.suffix ? `${stat.value}${stat.suffix}` : formatNumber(stat.value)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      {data && data.history && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={{ padding: 16, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 12 }}>Backlinks growth</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Backlinks and referring domains over the last year</div>
            <LineChart data={data.history} width={420} height={200} lines={[
              { key: 'backlinks', label: 'Backlinks', color: '#3b82f6' },
              { key: 'referringDomains', label: 'Referring Domains', color: '#10b981' },
            ]} />
          </div>
          <div style={{ padding: 16, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 12 }}>New vs lost</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Backlinks acquisition and attrition</div>
            <LineChart data={data.history} width={420} height={200} lines={[
              { key: 'lostBacklinks', label: 'Lost backlinks', color: '#ef4444' },
              { key: 'newBacklinks', label: 'New backlinks', color: '#10b981' },
            ]} />
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
            {activeTab === 'backlinks' && 'See the individual links pointing to your target, including source page, anchor text, and link quality signals.'}
            {activeTab === 'referring-domains' && 'View the unique domains linking to your target, grouped at the site level instead of by individual link.'}
            {activeTab === 'top-pages' && 'See which pages on the target site attract the most backlinks and referring domains.'}
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
              {activeFilterCount > 0 ? `${activeFilterCount} / 8 conditions` : '0 / 8 conditions'}
            </span>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div style={{ padding: 16, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Refine table results</span>
                <button onClick={clearFilters} style={{ fontSize: 12, color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Clear all</button>
              </div>

              {activeTab === 'backlinks' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Source URL Contains</label>
                      <input type="text" value={filters.include} onChange={(e) => setFilters((f) => ({ ...f, include: e.target.value }))} placeholder="example.com, blog" style={{ width: '100%', padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Source URL Excludes</label>
                      <input type="text" value={filters.exclude} onChange={(e) => setFilters((f) => ({ ...f, exclude: e.target.value }))} placeholder="spam, forum" style={{ width: '100%', padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Domain Authority</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="number" value={filters.domainAuthorityMin} onChange={(e) => setFilters((f) => ({ ...f, domainAuthorityMin: e.target.value }))} placeholder="Min" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                        <input type="number" value={filters.domainAuthorityMax} onChange={(e) => setFilters((f) => ({ ...f, domainAuthorityMax: e.target.value }))} placeholder="Max" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Link Authority</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="number" value={filters.linkAuthorityMin} onChange={(e) => setFilters((f) => ({ ...f, linkAuthorityMin: e.target.value }))} placeholder="Min" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                        <input type="number" value={filters.linkAuthorityMax} onChange={(e) => setFilters((f) => ({ ...f, linkAuthorityMax: e.target.value }))} placeholder="Max" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Spam Score</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="number" value={filters.spamScoreMin} onChange={(e) => setFilters((f) => ({ ...f, spamScoreMin: e.target.value }))} placeholder="Min" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                        <input type="number" value={filters.spamScoreMax} onChange={(e) => setFilters((f) => ({ ...f, spamScoreMax: e.target.value }))} placeholder="Max" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' }}>Link Type</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {['all', 'dofollow', 'nofollow'].map((t) => (
                          <button
                            key={t}
                            onClick={() => setFilters((f) => ({ ...f, linkType: t }))}
                            style={{
                              padding: '4px 10px',
                              fontSize: 12,
                              borderRadius: 'var(--border-radius-md)',
                              border: '0.5px solid var(--color-border-tertiary)',
                              background: filters.linkType === t ? 'var(--color-background-secondary)' : 'var(--color-background-primary)',
                              color: filters.linkType === t ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                              cursor: 'pointer',
                              fontWeight: filters.linkType === t ? 500 : 400,
                            }}
                          >
                            {t === 'all' ? 'All' : t === 'dofollow' ? 'Dofollow' : 'Nofollow'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' }}>Visibility</label>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={filters.visibilityLost} onChange={(e) => setFilters((f) => ({ ...f, visibilityLost: e.target.checked }))} style={{ cursor: 'pointer' }} />
                          Hide lost
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={filters.visibilityBroken} onChange={(e) => setFilters((f) => ({ ...f, visibilityBroken: e.target.checked }))} style={{ cursor: 'pointer' }} />
                          Hide broken
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'referring-domains' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Domain Contains</label>
                      <input type="text" value={filters.include} onChange={(e) => setFilters((f) => ({ ...f, include: e.target.value }))} placeholder="example.com, blog" style={{ width: '100%', padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Domain Excludes</label>
                      <input type="text" value={filters.exclude} onChange={(e) => setFilters((f) => ({ ...f, exclude: e.target.value }))} placeholder="spam, forum" style={{ width: '100%', padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Backlinks</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="number" value={filters.backlinksMin} onChange={(e) => setFilters((f) => ({ ...f, backlinksMin: e.target.value }))} placeholder="Min" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                        <input type="number" value={filters.backlinksMax} onChange={(e) => setFilters((f) => ({ ...f, backlinksMax: e.target.value }))} placeholder="Max" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Rank</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="number" value={filters.rankMin} onChange={(e) => setFilters((f) => ({ ...f, rankMin: e.target.value }))} placeholder="Min" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                        <input type="number" value={filters.rankMax} onChange={(e) => setFilters((f) => ({ ...f, rankMax: e.target.value }))} placeholder="Max" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Spam Score</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="number" value={filters.spamScoreMin} onChange={(e) => setFilters((f) => ({ ...f, spamScoreMin: e.target.value }))} placeholder="Min" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                        <input type="number" value={filters.spamScoreMax} onChange={(e) => setFilters((f) => ({ ...f, spamScoreMax: e.target.value }))} placeholder="Max" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'top-pages' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Page URL Contains</label>
                      <input type="text" value={filters.include} onChange={(e) => setFilters((f) => ({ ...f, include: e.target.value }))} placeholder="/blog, /products" style={{ width: '100%', padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Page URL Excludes</label>
                      <input type="text" value={filters.exclude} onChange={(e) => setFilters((f) => ({ ...f, exclude: e.target.value }))} placeholder="/tag, /author" style={{ width: '100%', padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Backlinks</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="number" value={filters.backlinksMin} onChange={(e) => setFilters((f) => ({ ...f, backlinksMin: e.target.value }))} placeholder="Min" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                        <input type="number" value={filters.backlinksMax} onChange={(e) => setFilters((f) => ({ ...f, backlinksMax: e.target.value }))} placeholder="Max" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Referring Domains</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="number" value={filters.referringDomainsMin} onChange={(e) => setFilters((f) => ({ ...f, referringDomainsMin: e.target.value }))} placeholder="Min" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                        <input type="number" value={filters.referringDomainsMax} onChange={(e) => setFilters((f) => ({ ...f, referringDomainsMax: e.target.value }))} placeholder="Max" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Rank</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="number" value={filters.rankMin} onChange={(e) => setFilters((f) => ({ ...f, rankMin: e.target.value }))} placeholder="Min" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                        <input type="number" value={filters.rankMax} onChange={(e) => setFilters((f) => ({ ...f, rankMax: e.target.value }))} placeholder="Max" style={{ flex: 1, padding: '6px 10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
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
                  {activeTab === 'backlinks' && (
                    <>
                      <Th onClick={() => handleSort('source')} sortKey={sortKey} colKey="source" sortDir={sortDir}>Source</Th>
                      <Th onClick={() => handleSort('target')} sortKey={sortKey} colKey="target" sortDir={sortDir}>Target</Th>
                      <Th onClick={() => handleSort('anchor')} sortKey={sortKey} colKey="anchor" sortDir={sortDir}>Anchor</Th>
                      <Th onClick={() => handleSort('dofollow')} sortKey={sortKey} colKey="dofollow" sortDir={sortDir}>Flags</Th>
                      <Th onClick={() => handleSort('domainAuthority')} sortKey={sortKey} colKey="domainAuthority" sortDir={sortDir}>Link</Th>
                    </>
                  )}
                  {activeTab === 'referring-domains' && (
                    <>
                      <Th onClick={() => handleSort('domain')} sortKey={sortKey} colKey="domain" sortDir={sortDir}>Domain</Th>
                      <Th onClick={() => handleSort('backlinks')} sortKey={sortKey} colKey="backlinks" sortDir={sortDir}>Backlinks</Th>
                      <Th onClick={() => handleSort('referringPages')} sortKey={sortKey} colKey="referringPages" sortDir={sortDir}>Referring Pages</Th>
                      <Th onClick={() => handleSort('rank')} sortKey={sortKey} colKey="rank" sortDir={sortDir}>Rank</Th>
                      <Th onClick={() => handleSort('spamScore')} sortKey={sortKey} colKey="spamScore" sortDir={sortDir}>Spam</Th>
                      <Th onClick={() => handleSort('firstSeen')} sortKey={sortKey} colKey="firstSeen" sortDir={sortDir}>First Seen</Th>
                      <Th sortKey={sortKey} colKey="issues" sortDir={sortDir}>Issues</Th>
                    </>
                  )}
                  {activeTab === 'top-pages' && (
                    <>
                      <Th onClick={() => handleSort('page')} sortKey={sortKey} colKey="page" sortDir={sortDir}>Page</Th>
                      <Th onClick={() => handleSort('backlinks')} sortKey={sortKey} colKey="backlinks" sortDir={sortDir}>Backlinks</Th>
                      <Th onClick={() => handleSort('referringDomains')} sortKey={sortKey} colKey="referringDomains" sortDir={sortDir}>Referring Domains</Th>
                      <Th onClick={() => handleSort('rank')} sortKey={sortKey} colKey="rank" sortDir={sortDir}>Rank</Th>
                      <Th onClick={() => handleSort('brokenBacklinks')} sortKey={sortKey} colKey="brokenBacklinks" sortDir={sortDir}>Broken Backlinks</Th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'backlinks' ? 5 : activeTab === 'referring-domains' ? 7 : 5} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                      No data to display. {activeFilterCount > 0 ? 'Try adjusting your filters.' : 'Search for a domain to get started.'}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                      {activeTab === 'backlinks' && (
                        <>
                          <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-info)' }}>{extractDomain(item.source)}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.source}</div>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.target}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                            <div>{item.anchor}</div>
                            <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', padding: '1px 6px', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-secondary)', display: 'inline-block', marginTop: 2 }}>anchor</span>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 12 }}>
                            {item.dofollow && <span style={{ color: '#10b981', fontWeight: 500 }}>dofollow</span>}
                            {item.nofollow && <span style={{ color: '#ef4444', fontWeight: 500 }}>nofollow</span>}
                            {!item.dofollow && !item.nofollow && <span style={{ color: 'var(--color-text-tertiary)' }}>-</span>}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{item.domainAuthority || 0}</td>
                        </>
                      )}
                      {activeTab === 'referring-domains' && (
                        <>
                          <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500, color: 'var(--color-text-info)' }}>{item.domain}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-primary)' }}>{formatNumber(item.backlinks)}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-primary)' }}>{formatNumber(item.referringPages)}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-primary)' }}>{item.rank || 0}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-primary)' }}>{item.spamScore || 0}</td>
                          <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>{formatDate(item.firstSeen)}</td>
                          <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                            Broken links: {item.brokenLinks || 0}<br />
                            Broken pages: {item.brokenPages || 0}
                          </td>
                        </>
                      )}
                      {activeTab === 'top-pages' && (
                        <>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-info)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.page}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-primary)' }}>{formatNumber(item.backlinks)}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-primary)' }}>{formatNumber(item.referringDomains)}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-primary)' }}>{item.rank || 0}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-primary)' }}>{item.brokenBacklinks || 0}</td>
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

      {!data && !loading && (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14, border: '1px dashed var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-secondary)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>&#x1F517;</div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>Enter a domain to analyze backlinks</div>
          <div style={{ fontSize: 13 }}>Type a domain above and click Search to get started.</div>
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
            {isActive ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}
          </span>
        )}
      </span>
    </th>
  );
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
