'use client';

import { useState, useEffect, useRef } from 'react';
import PreviousAudits from '@/components/PreviousAudits';

function formatNumber(n) {
  if (n === undefined || n === null) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function formatDate(str) {
  try {
    return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return str;
  }
}

function sortData(data, sortKey, sortDir) {
  if (!sortKey) return data;
  return [...data].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
    const as = String(av || '').toLowerCase();
    const bs = String(bv || '').toLowerCase();
    return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
  });
}

export default function SiteAuditPage() {
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(50);
  const [includeLighthouse, setIncludeLighthouse] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('issues');
  const [history, setHistory] = useState([]);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);
  const [expandedIssues, setExpandedIssues] = useState({});

  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    altText: 'all',
    wordsMin: '',
    wordsMax: '',
    speedMin: '',
    speedMax: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem('seo-site-audit-history');
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load site audit history:', e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('seo-site-audit-history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    function handleClick(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const startAudit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);
    setActiveTab('issues');

    try {
      const res = await fetch('/api/site-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), maxPages, includeLighthouse }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Audit failed');

      setData(json);
      const record = {
        id: `audit-${Date.now()}`,
        target: json.domain || url.trim(),
        url: json.url,
        date: new Date().toISOString(),
        status: 'done',
        pages: json.crawledCount,
        lighthouse: includeLighthouse ? 'Included' : 'Not included',
        data: json,
      };
      setHistory((prev) => [record, ...prev]);
    } catch (err) {
      setError(err.message || 'Audit failed');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = (record) => {
    setData(record.data);
    setUrl(record.url);
    setMaxPages(record.data.maxPages || 50);
    setIncludeLighthouse(record.data.includeLighthouse || false);
    setActiveTab('issues');
  };

  const deleteHistory = (id) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const clearHistory = () => {
    if (typeof window !== 'undefined' && window.confirm('Clear all site audit history?')) {
      setHistory([]);
    }
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
    setShowFilters(false);
  };

  const clearFilters = () => {
    const reset = {
      search: '',
      status: 'all',
      altText: 'all',
      wordsMin: '',
      wordsMax: '',
      speedMin: '',
      speedMax: '',
    };
    setFilters(reset);
    setAppliedFilters(reset);
    setShowFilters(false);
  };

  const activeFilterCount = Object.entries(appliedFilters).filter(([k, v]) => {
    if (k === 'status' || k === 'altText') return v !== 'all';
    return v !== '';
  }).length;

  const getFilteredPages = () => {
    if (!data || !data.pages) return [];
    let items = data.pages;
    const f = appliedFilters;

    const search = (f.search || '').toLowerCase().trim();
    if (search) {
      items = items.filter((p) =>
        (p.url || '').toLowerCase().includes(search) ||
        (p.title || '').toLowerCase().includes(search) ||
        (p.h1 || '').toLowerCase().includes(search) ||
        (p.metaDescription || '').toLowerCase().includes(search)
      );
    }

    if (f.status !== 'all') {
      items = items.filter((p) => {
        if (f.status === '200') return p.status === 200;
        if (f.status === '2xx') return p.status >= 200 && p.status < 300;
        if (f.status === '3xx') return p.status >= 300 && p.status < 400;
        if (f.status === '4xx') return p.status >= 400 && p.status < 500;
        if (f.status === '5xx') return p.status >= 500;
        return true;
      });
    }

    if (f.altText === 'missing') {
      items = items.filter((p) => (p.issues || []).includes('missing_alt_text'));
    } else if (f.altText === 'present') {
      items = items.filter((p) => !(p.issues || []).includes('missing_alt_text'));
    }

    if (f.wordsMin !== '') items = items.filter((p) => p.words >= Number(f.wordsMin));
    if (f.wordsMax !== '') items = items.filter((p) => p.words <= Number(f.wordsMax));
    if (f.speedMin !== '') items = items.filter((p) => p.speed >= Number(f.speedMin));
    if (f.speedMax !== '') items = items.filter((p) => p.speed <= Number(f.speedMax));

    return sortData(items, sortKey, sortDir);
  };

  const filteredPages = getFilteredPages();

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleExport = async (format) => {
    setExportOpen(false);
    if (!data) return;
    const type = activeTab === 'issues' ? 'issues' : 'pages';
    const payload = activeTab === 'issues' ? data.issues : filteredPages;
    if (!payload || payload.length === 0) return;
    try {
      const res = await fetch('/api/site-audit/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, type, data: payload }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `site-audit-${type}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + (err.message || 'Unknown'));
    }
  };

  const toggleIssue = (key) => {
    setExpandedIssues((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div>
      <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text-primary)' }}>Site Audit</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
          Crawl any site to uncover technical SEO issues and page-level performance metrics.
        </p>
      </div>

      {/* Start New Audit */}
      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        padding: 20,
        marginBottom: 24,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: 'var(--color-text-primary)' }}>Start New Audit</h3>
        <form onSubmit={startAudit}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 13,
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 'var(--border-radius-md)',
                  background: 'var(--color-background-primary)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              style={{
                padding: '10px 24px',
                fontSize: 13,
                fontWeight: 500,
                background: loading || !url.trim() ? 'var(--color-border-tertiary)' : 'var(--color-blue-600)',
                color: loading || !url.trim() ? 'var(--color-text-tertiary)' : '#fff',
                border: 'none',
                borderRadius: 'var(--border-radius-md)',
                cursor: loading || !url.trim() ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => { if (!loading && url.trim()) e.target.style.background = 'var(--color-blue-800)'; }}
              onMouseLeave={(e) => { if (!loading && url.trim()) e.target.style.background = 'var(--color-blue-600)'; }}
            >
              {loading ? 'Auditing...' : 'Start Audit'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 6 }}>Crawl Limit</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Max pages</span>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={maxPages}
                  onChange={(e) => setMaxPages(Math.max(10, Math.min(100, Number(e.target.value) || 10)))}
                  disabled={loading}
                  style={{
                    width: 80,
                    padding: '6px 8px',
                    fontSize: 13,
                    border: '0.5px solid var(--color-border-tertiary)',
                    borderRadius: 'var(--border-radius-md)',
                    background: 'var(--color-background-primary)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '6px 0 0' }}>Enter any value from 10 to 100.</p>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              <input
                type="checkbox"
                checked={includeLighthouse}
                onChange={(e) => setIncludeLighthouse(e.target.checked)}
                disabled={loading}
                style={{ cursor: 'pointer' }}
              />
              Include Lighthouse
            </label>
          </div>
        </form>

        {error && (
          <div style={{
            marginTop: 16,
            padding: 10,
            borderRadius: 'var(--border-radius-md)',
            background: 'var(--color-background-danger)',
            color: 'var(--color-text-danger)',
            fontSize: 13,
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Previous Audits */}
      <PreviousAudits
        title="Previous Audits"
        items={history}
        columns={[
          { key: 'target', label: 'URL' },
          { key: 'pages', label: 'Pages', align: 'right' },
          { key: 'lighthouse', label: 'Lighthouse' },
        ]}
        onSelect={loadHistory}
        onDelete={deleteHistory}
        onClear={clearHistory}
      />

      {/* Results */}
      {data && (
        <div style={{ marginTop: 24 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text-primary)' }}>{data.domain}</h2>
              <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>Site audit · Started {formatDate(new Date().toISOString())}</p>
            </div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 12px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 500,
              background: 'var(--color-green-100)',
              color: 'var(--color-green-600)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-green-600)' }} />
              Done
            </span>
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            <SummaryCard label="Pages Crawled" value={data.crawledCount} />
            <SummaryCard label="Issues Found" value={data.summary?.totalIssues || 0} sub={`${data.summary?.errors || 0} errors · ${data.summary?.warnings || 0} warnings · ${data.summary?.infos || 0} info`} />
            <SummaryCard label="Avg Response" value={`${data.summary?.avgResponse || 0}ms`} />
          </div>

          {/* Tabs + Export */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 0, borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              {['issues', 'pages'].map((t) => (
                <button
                  key={t}
                  onClick={() => { setActiveTab(t); setSortKey(''); setSortDir('desc'); setShowFilters(false); setExportOpen(false); }}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: activeTab === t ? 500 : 400,
                    color: activeTab === t ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    borderBottom: activeTab === t ? '2px solid var(--color-text-info)' : '2px solid transparent',
                    marginBottom: -1,
                    textTransform: 'capitalize',
                  }}
                >
                  {t} ({t === 'issues' ? (data.issues || []).length : (data.pages || []).length})
                </button>
              ))}
            </div>
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
                  position: 'absolute', top: '100%', right: 0, marginTop: 4,
                  background: 'var(--color-background-primary)',
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 'var(--border-radius-md)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  zIndex: 10, minWidth: 120, padding: '4px 0',
                }}>
                  <button onClick={() => handleExport('csv')} style={{ display: 'block', width: '100%', padding: '8px 16px', textAlign: 'left', border: 'none', background: 'transparent', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-primary)' }}>Export CSV</button>
                  <button onClick={() => handleExport('xlsx')} style={{ display: 'block', width: '100%', padding: '8px 16px', textAlign: 'left', border: 'none', background: 'transparent', fontSize: 13, cursor: 'pointer', color: 'var(--color-text-primary)' }}>Export XLSX</button>
                </div>
              )}
            </div>
          </div>

          {/* Issues Tab */}
          {activeTab === 'issues' && (
            <div>
              {data.issues.map((issue) => (
                <div key={issue.key} style={{
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 'var(--border-radius-md)',
                  background: 'var(--color-background-primary)',
                  marginBottom: 12,
                  overflow: 'hidden',
                }}>
                  <div
                    onClick={() => toggleIssue(issue.key)}
                    style={{
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <IssueDot type={issue.type} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 2 }}>{issue.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{issue.description}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{issue.count} pages</span>
                      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{expandedIssues[issue.key] ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {expandedIssues[issue.key] && (
                    <div style={{ padding: '0 16px 16px', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
                      <div style={{
                        padding: 12,
                        background: 'var(--color-background-secondary)',
                        borderRadius: 'var(--border-radius-md)',
                        marginBottom: 12,
                        fontSize: 13,
                        color: 'var(--color-text-secondary)',
                      }}>
                        <strong>How to fix:</strong> {issue.fix}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {issue.pages.map((page, i) => (
                          <a
                            key={i}
                            href={page}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 12,
                              color: 'var(--color-blue-600)',
                              textDecoration: 'none',
                              padding: '6px 10px',
                              border: '0.5px solid var(--color-border-tertiary)',
                              borderRadius: 'var(--border-radius-md)',
                              background: 'var(--color-background-primary)',
                            }}
                          >
                            {page}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {data.issues.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13, border: '1px dashed var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)' }}>
                  No issues found. Good job.
                </div>
              )}
            </div>
          )}

          {/* Pages Tab */}
          {activeTab === 'pages' && (
            <div>
              {/* Filter bar */}
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
                  {activeFilterCount > 0 && <span style={{ display: 'inline-flex', width: 16, height: 16, borderRadius: '50%', background: 'var(--color-text-info)', color: '#fff', fontSize: 10, alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>{activeFilterCount}</span>}
                </button>
                <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{filteredPages.length} of {data.pages.length}</span>
              </div>

              {showFilters && (
                <div style={{
                  padding: 16,
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 'var(--border-radius-md)',
                  background: 'var(--color-background-primary)',
                  marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Refine table results</span>
                    <button onClick={clearFilters} style={{ fontSize: 12, color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Clear all</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={filterLabelStyle}>SEARCH</label>
                      <input type="text" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} placeholder="URL, title, meta" style={inputFilterStyle} />
                    </div>
                    <div>
                      <label style={filterLabelStyle}>STATUS</label>
                      <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} style={inputFilterStyle}>
                        <option value="all">All</option>
                        <option value="200">200 OK</option>
                        <option value="2xx">2xx Success</option>
                        <option value="3xx">3xx Redirect</option>
                        <option value="4xx">4xx Client Error</option>
                        <option value="5xx">5xx Server Error</option>
                      </select>
                    </div>
                    <div>
                      <label style={filterLabelStyle}>ALT TEXT</label>
                      <select value={filters.altText} onChange={(e) => setFilters((f) => ({ ...f, altText: e.target.value }))} style={inputFilterStyle}>
                        <option value="all">All</option>
                        <option value="missing">Missing</option>
                        <option value="present">Present</option>
                      </select>
                    </div>
                    <div>
                      <label style={filterLabelStyle}>WORDS</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="number" value={filters.wordsMin} onChange={(e) => setFilters((f) => ({ ...f, wordsMin: e.target.value }))} placeholder="Min" style={inputFilterStyle} />
                        <input type="number" value={filters.wordsMax} onChange={(e) => setFilters((f) => ({ ...f, wordsMax: e.target.value }))} placeholder="Max" style={inputFilterStyle} />
                      </div>
                    </div>
                    <div>
                      <label style={filterLabelStyle}>SPEED MS</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="number" value={filters.speedMin} onChange={(e) => setFilters((f) => ({ ...f, speedMin: e.target.value }))} placeholder="Min" style={inputFilterStyle} />
                        <input type="number" value={filters.speedMax} onChange={(e) => setFilters((f) => ({ ...f, speedMax: e.target.value }))} placeholder="Max" style={inputFilterStyle} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={() => setShowFilters(false)} style={{ padding: '6px 14px', fontSize: 12, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={applyFilters} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 'var(--border-radius-md)', background: 'var(--color-text-info)', color: '#fff', cursor: 'pointer' }}>Apply filters</button>
                  </div>
                </div>
              )}

              {/* Pages table */}
              <div style={{ overflowX: 'auto', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)' }}>
                      <Th onClick={() => handleSort('url')} sortKey={sortKey} colKey="url" sortDir={sortDir}>URL</Th>
                      <Th onClick={() => handleSort('status')} sortKey={sortKey} colKey="status" sortDir={sortDir}>Status</Th>
                      <Th onClick={() => handleSort('title')} sortKey={sortKey} colKey="title" sortDir={sortDir}>Title</Th>
                      <Th onClick={() => handleSort('h1')} sortKey={sortKey} colKey="h1" sortDir={sortDir}>H1</Th>
                      <Th onClick={() => handleSort('words')} sortKey={sortKey} colKey="words" sortDir={sortDir}>Words</Th>
                      <Th onClick={() => handleSort('images')} sortKey={sortKey} colKey="images" sortDir={sortDir}>Images</Th>
                      <Th onClick={() => handleSort('speed')} sortKey={sortKey} colKey="speed" sortDir={sortDir}>Speed</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPages.map((page, idx) => (
                      <tr key={idx} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                        <td style={{ padding: '10px 12px', color: 'var(--color-blue-600)', fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <a href={page.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{page.url}</a>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <StatusBadge status={page.status} />
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-text-primary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.title || '-'}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-text-primary)' }}>{page.h1 || '-'}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-text-primary)', textAlign: 'right' }}>{page.words}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-text-primary)', textAlign: 'right' }}>{page.images}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-text-primary)', textAlign: 'right', whiteSpace: 'nowrap' }}>{page.speed}ms</td>
                      </tr>
                    ))}
                    {filteredPages.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                          No pages found. Try adjusting your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub }) {
  return (
    <div style={{ padding: 20, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', background: 'var(--color-background-primary)' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>{formatNumber(value)}</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{sub}</div>}
    </div>
  );
}

function IssueDot({ type }) {
  const colors = {
    error: 'var(--color-red-500)',
    warning: 'var(--color-yellow-500)',
    info: 'var(--color-blue-500)',
  };
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[type] || colors.info, flexShrink: 0 }} />;
}

function StatusBadge({ status }) {
  const isOk = status >= 200 && status < 300;
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: 10,
      fontSize: 11,
      fontWeight: 600,
      background: isOk ? 'var(--color-green-100)' : 'var(--color-red-100)',
      color: isOk ? 'var(--color-green-600)' : 'var(--color-red-600)',
    }}>
      {status}
    </span>
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

const filterLabelStyle = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--color-text-tertiary)',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
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
