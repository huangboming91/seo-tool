'use client';

import { useState, useEffect, useRef } from 'react';
import PreviousAudits from '@/components/PreviousAudits';

const COUNTRIES = [
  { value: 'united_states', label: 'United States' },
  { value: 'united_kingdom', label: 'United Kingdom' },
  { value: 'germany', label: 'Germany' },
  { value: 'china', label: 'China' },
  { value: 'france', label: 'France' },
  { value: 'australia', label: 'Australia' },
  { value: 'canada', label: 'Canada' },
  { value: 'japan', label: 'Japan' },
  { value: 'india', label: 'India' },
  { value: 'brazil', label: 'Brazil' },
  { value: 'spain', label: 'Spain' },
  { value: 'italy', label: 'Italy' },
  { value: 'netherlands', label: 'Netherlands' },
  { value: 'russia', label: 'Russia' },
  { value: 'south_korea', label: 'South Korea' },
  { value: 'turkey', label: 'Turkey' },
  { value: 'poland', label: 'Poland' },
  { value: 'sweden', label: 'Sweden' },
  { value: 'mexico', label: 'Mexico' },
  { value: 'indonesia', label: 'Indonesia' },
  { value: 'south_africa', label: 'South Africa' },
];

export default function DomainOverviewPage() {
  const [domain, setDomain] = useState('');
  const [country, setCountry] = useState('united_states');
  const [includeSubdomains, setIncludeSubdomains] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('keywords'); // 'keywords' | 'pages'
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('seo-domain-overview-history');
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load domain overview history:', e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('seo-domain-overview-history', JSON.stringify(history));
  }, [history]);

  const loadHistory = (record) => {
    setData(record.results);
    setDomain(record.domain || '');
    setCountry(record.country || 'united_states');
    setIncludeSubdomains(record.includeSubdomains || false);
    setError(null);
  };

  const deleteHistory = (id) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const clearHistory = () => {
    if (typeof window !== 'undefined' && window.confirm('Clear all domain overview history?')) {
      setHistory([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!domain.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch('/api/domain-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
          country,
          includeSubdomains,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Failed to fetch domain data');
        setLoading(false);
        return;
      }

      setData(result);

      const record = {
        id: `do-${Date.now()}`,
        target: domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
        date: new Date().toISOString(),
        status: 'done',
        domain: domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
        country,
        includeSubdomains,
        results: result,
      };
      setHistory((prev) => [record, ...prev].slice(0, 20));

      setLoading(false);
    } catch (e) {
      setError(e.message || 'Network error');
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text-primary)' }}>
          Domain Overview
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
          Analyze any domain's SEO profile: traffic, keywords, and backlinks.
        </p>
      </div>

      {/* Input form */}
      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        padding: 20,
        marginBottom: 24,
      }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Enter domain</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                disabled={loading}
                style={inputStyle}
                autoFocus
              />
            </div>
            <div>
              <label style={labelStyle}>Country</label>
              <select value={country} onChange={(e) => setCountry(e.target.value)} disabled={loading} style={inputStyle}>
                {COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              <input
                type="checkbox"
                checked={includeSubdomains}
                onChange={(e) => setIncludeSubdomains(e.target.checked)}
                disabled={loading}
                style={{ cursor: 'pointer' }}
              />
              Include subdomains
            </label>
          </div>
          <button
            type="submit"
            disabled={loading || !domain.trim()}
            style={{
              width: '100%',
              padding: 10,
              fontSize: 13,
              fontWeight: 500,
              background: loading ? 'var(--color-border-tertiary)' : 'var(--color-blue-600)',
              color: loading ? 'var(--color-text-tertiary)' : '#fff',
              border: 'none',
              borderRadius: 'var(--border-radius-md)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => { if (!loading) e.target.style.background = 'var(--color-blue-800)'; }}
            onMouseLeave={(e) => { if (!loading) e.target.style.background = 'var(--color-blue-600)'; }}
          >
            {loading ? 'Analyzing...' : 'Analyze Domain'}
          </button>
        </form>

        {error && (
          <div style={{
            marginTop: 14,
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
          { key: 'target', label: 'Domain' },
          { key: 'country', label: 'Country' },
        ]}
        onSelect={loadHistory}
        onDelete={deleteHistory}
        onClear={clearHistory}
      />

      {/* Results */}
      {data && (
        <div>
          {/* Overview metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            marginBottom: 24,
          }}>
            <MetricCard label="ESTIMATED ORGANIC TRAFFIC" value={data.metrics?.organicTraffic?.toLocaleString() || 'N/A'} />
            <MetricCard label="ORGANIC KEYWORDS" value={data.metrics?.organicKeywords?.toLocaleString() || 'N/A'} />
          </div>

          {/* Tabs */}
          <div style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', marginBottom: 16 }}>
            <button
              onClick={() => setActiveTab('keywords')}
              style={{
                padding: '8px 0 10px',
                marginRight: 20,
                fontSize: 13,
                fontWeight: 600,
                color: activeTab === 'keywords' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === 'keywords' ? 'var(--color-text-primary)' : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              Top Keywords
            </button>
            <button
              onClick={() => setActiveTab('pages')}
              style={{
                padding: '8px 0 10px',
                marginRight: 20,
                fontSize: 13,
                fontWeight: 600,
                color: activeTab === 'pages' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === 'pages' ? 'var(--color-text-primary)' : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              Top Pages
            </button>
          </div>

          {activeTab === 'keywords' && (
            <TopKeywordsTable keywords={data.keywords || []} />
          )}
          {activeTab === 'pages' && (
            <TopPagesTable pages={data.pages || []} />
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      padding: 20,
    }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)' }}>
        {value}
      </div>
    </div>
  );
}

function TopKeywordsTable({ keywords }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [includeTerms, setIncludeTerms] = useState('');
  const [excludeTerms, setExcludeTerms] = useState('');
  const [trafficMin, setTrafficMin] = useState('');
  const [trafficMax, setTrafficMax] = useState('');
  const [volMin, setVolMin] = useState('');
  const [volMax, setVolMax] = useState('');
  const [rankMin, setRankMin] = useState('');
  const [rankMax, setRankMax] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);
  const [sortCol, setSortCol] = useState('rank');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    function handleClickOutside(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters = includeTerms || excludeTerms || trafficMin || trafficMax || volMin || volMax || rankMin || rankMax;

  const filtered = keywords.filter((k) => {
    const lowerKw = k.keyword.toLowerCase();
    if (includeTerms) {
      const terms = includeTerms.toLowerCase().split(',').map((t) => t.trim()).filter(Boolean);
      if (terms.length > 0 && !terms.some((t) => lowerKw.includes(t))) return false;
    }
    if (excludeTerms) {
      const terms = excludeTerms.toLowerCase().split(',').map((t) => t.trim()).filter(Boolean);
      if (terms.length > 0 && terms.some((t) => lowerKw.includes(t))) return false;
    }
    const traffic = Number(k.traffic) || 0;
    if (trafficMin !== '' && traffic < Number(trafficMin)) return false;
    if (trafficMax !== '' && traffic > Number(trafficMax)) return false;
    const vol = Number(k.volume) || 0;
    if (volMin !== '' && vol < Number(volMin)) return false;
    if (volMax !== '' && vol > Number(volMax)) return false;
    const rank = k.rank === '-' ? 9999 : Number(k.rank) || 9999;
    if (rankMin !== '' && rank < Number(rankMin)) return false;
    if (rankMax !== '' && rank > Number(rankMax)) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
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

  const handleExport = async (format) => {
    setExportOpen(false);
    if (sorted.length === 0) return;
    try {
      const res = await fetch('/api/domain-overview/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, keywords: sorted, type: 'keywords' }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `domain-overview-keywords.${format}`;
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
            onClick={() => setFilterOpen(!filterOpen)}
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
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{filtered.length} keywords</span>
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
      {filterOpen && (
        <div style={{
          padding: '16px 16px 4px',
          borderBottom: '0.5px solid var(--color-border-tertiary)',
          background: 'var(--color-background-secondary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>Refine table results</h4>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setIncludeTerms(''); setExcludeTerms(''); setTrafficMin(''); setTrafficMax(''); setVolMin(''); setVolMax(''); setRankMin(''); setRankMax('');
                }}
                style={{
                  fontSize: 11, color: 'var(--color-text-secondary)', background: 'none', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                Clear all
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ ...filterLabelStyle }}>INCLUDE TERMS</label>
              <input type="text" value={includeTerms} onChange={(e) => setIncludeTerms(e.target.value)} placeholder="audit, checker, template" style={inputFilterStyle} />
            </div>
            <div>
              <label style={{ ...filterLabelStyle }}>EXCLUDE TERMS</label>
              <input type="text" value={excludeTerms} onChange={(e) => setExcludeTerms(e.target.value)} placeholder="jobs, salary, course" style={inputFilterStyle} />
            </div>
            <div>
              <label style={{ ...filterLabelStyle }}>TRAFFIC</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="number" value={trafficMin} onChange={(e) => setTrafficMin(e.target.value)} placeholder="Min" style={{ ...inputFilterStyle, flex: 1 }} />
                <input type="number" value={trafficMax} onChange={(e) => setTrafficMax(e.target.value)} placeholder="Max" style={{ ...inputFilterStyle, flex: 1 }} />
              </div>
            </div>
            <div>
              <label style={{ ...filterLabelStyle }}>VOLUME</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="number" value={volMin} onChange={(e) => setVolMin(e.target.value)} placeholder="Min" style={{ ...inputFilterStyle, flex: 1 }} />
                <input type="number" value={volMax} onChange={(e) => setVolMax(e.target.value)} placeholder="Max" style={{ ...inputFilterStyle, flex: 1 }} />
              </div>
            </div>
            <div>
              <label style={{ ...filterLabelStyle }}>RANK</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="number" value={rankMin} onChange={(e) => setRankMin(e.target.value)} placeholder="Min" style={{ ...inputFilterStyle, flex: 1 }} />
                <input type="number" value={rankMax} onChange={(e) => setRankMax(e.target.value)} placeholder="Max" style={{ ...inputFilterStyle, flex: 1 }} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 12 }}>
            <button
              onClick={() => setFilterOpen(false)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 500,
                background: 'transparent', color: 'var(--color-text-secondary)',
                border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => setFilterOpen(false)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 500,
                background: 'var(--color-blue-600)', color: '#fff',
                border: 'none', borderRadius: 'var(--border-radius-md)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--color-blue-800)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--color-blue-600)'}
            >
              Apply filters
            </button>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('keyword')}>Keyword{sortArrow('keyword')}</th>
              <th style={{ ...thStyle, textAlign: 'center', cursor: 'pointer', width: 60 }} onClick={() => handleSort('rank')}>Rank{sortArrow('rank')}</th>
              <th style={{ ...thStyle, textAlign: 'right', cursor: 'pointer', width: 80 }} onClick={() => handleSort('volume')}>Volume{sortArrow('volume')}</th>
              <th style={{ ...thStyle, textAlign: 'right', cursor: 'pointer', width: 80 }} onClick={() => handleSort('traffic')}>Traffic{sortArrow('traffic')}</th>
              <th style={{ ...thStyle, textAlign: 'right', cursor: 'pointer', width: 60 }}>CPC</th>
              <th style={{ ...thStyle, cursor: 'pointer' }}>URL</th>
              <th style={{ ...thStyle, textAlign: 'right', cursor: 'pointer', width: 60 }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((k, i) => (
              <tr key={i} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                <td style={{ padding: '8px 12px', color: 'var(--color-text-primary)', fontWeight: 500 }}>{k.keyword}</td>
                <td style={{ padding: '8px 4px', textAlign: 'center', color: 'var(--color-text-primary)' }}>{k.rank === '-' ? '—' : k.rank}</td>
                <td style={{ padding: '8px 4px', textAlign: 'right', color: 'var(--color-text-primary)' }}>{k.volume?.toLocaleString?.() || k.volume || 0}</td>
                <td style={{ padding: '8px 4px', textAlign: 'right', color: 'var(--color-text-primary)' }}>{k.traffic?.toLocaleString?.() || k.traffic || 0}</td>
                <td style={{ padding: '8px 4px', textAlign: 'right', color: 'var(--color-text-primary)' }}>{k.cpc || '-'}</td>
                <td style={{ padding: '8px 4px', color: 'var(--color-text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {k.url ? (
                    <a href={k.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-blue-600)', textDecoration: 'none' }}>
                      {k.url}
                    </a>
                  ) : (
                    <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>
                  )}
                </td>
                <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                  {k.score !== undefined ? (
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 6px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 600,
                      background: k.score <= 10 ? 'var(--color-green-100)' : k.score <= 30 ? 'var(--color-yellow-100)' : 'var(--color-red-100)',
                      color: k.score <= 10 ? 'var(--color-green-600)' : k.score <= 30 ? 'var(--color-yellow-600)' : 'var(--color-red-600)',
                    }}>
                      {k.score}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                  No keywords found. Try adjusting your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TopPagesTable({ pages }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [includeTerms, setIncludeTerms] = useState('');
  const [excludeTerms, setExcludeTerms] = useState('');
  const [trafficMin, setTrafficMin] = useState('');
  const [trafficMax, setTrafficMax] = useState('');
  const [keywordsMin, setKeywordsMin] = useState('');
  const [keywordsMax, setKeywordsMax] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);
  const [sortCol, setSortCol] = useState('organicTraffic');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    function handleClickOutside(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters = includeTerms || excludeTerms || trafficMin || trafficMax || keywordsMin || keywordsMax;

  const filtered = pages.filter((p) => {
    const lowerUrl = (p.url || p.page || '').toLowerCase();
    if (includeTerms) {
      const terms = includeTerms.toLowerCase().split(',').map((t) => t.trim()).filter(Boolean);
      if (terms.length > 0 && !terms.some((t) => lowerUrl.includes(t))) return false;
    }
    if (excludeTerms) {
      const terms = excludeTerms.toLowerCase().split(',').map((t) => t.trim()).filter(Boolean);
      if (terms.length > 0 && terms.some((t) => lowerUrl.includes(t))) return false;
    }
    const traffic = Number(p.organicTraffic) || 0;
    if (trafficMin !== '' && traffic < Number(trafficMin)) return false;
    if (trafficMax !== '' && traffic > Number(trafficMax)) return false;
    const kwCount = Number(p.keywords) || 0;
    if (keywordsMin !== '' && kwCount < Number(keywordsMin)) return false;
    if (keywordsMax !== '' && kwCount > Number(keywordsMax)) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let va = a[sortCol];
    let vb = b[sortCol];
    if (sortCol === 'page') {
      va = String(va).toLowerCase();
      vb = String(vb).toLowerCase();
    } else {
      va = Number(va) || 0;
      vb = Number(vb) || 0;
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

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

  const handleExport = async (format) => {
    setExportOpen(false);
    if (sorted.length === 0) return;
    try {
      const res = await fetch('/api/domain-overview/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, pages: sorted, type: 'pages' }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `domain-overview-pages.${format}`;
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
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
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
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{filtered.length} pages</span>
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

      {filterOpen && (
        <div style={{
          padding: '16px 16px 4px',
          borderBottom: '0.5px solid var(--color-border-tertiary)',
          background: 'var(--color-background-secondary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>Refine table results</h4>
            {hasActiveFilters && (
              <button
                onClick={() => { setIncludeTerms(''); setExcludeTerms(''); setTrafficMin(''); setTrafficMax(''); setKeywordsMin(''); setKeywordsMax(''); }}
                style={{
                  fontSize: 11, color: 'var(--color-text-secondary)', background: 'none', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                Clear all
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ ...filterLabelStyle }}>INCLUDE PAGE TERMS</label>
              <input type="text" value={includeTerms} onChange={(e) => setIncludeTerms(e.target.value)} placeholder="pricing, tools, guides" style={inputFilterStyle} />
            </div>
            <div>
              <label style={{ ...filterLabelStyle }}>EXCLUDE PAGE TERMS</label>
              <input type="text" value={excludeTerms} onChange={(e) => setExcludeTerms(e.target.value)} placeholder="blog, tag, archive" style={inputFilterStyle} />
            </div>
            <div>
              <label style={{ ...filterLabelStyle }}>TRAFFIC</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="number" value={trafficMin} onChange={(e) => setTrafficMin(e.target.value)} placeholder="Min" style={{ ...inputFilterStyle, flex: 1 }} />
                <input type="number" value={trafficMax} onChange={(e) => setTrafficMax(e.target.value)} placeholder="Max" style={{ ...inputFilterStyle, flex: 1 }} />
              </div>
            </div>
            <div>
              <label style={{ ...filterLabelStyle }}>KEYWORDS</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="number" value={keywordsMin} onChange={(e) => setKeywordsMin(e.target.value)} placeholder="Min" style={{ ...inputFilterStyle, flex: 1 }} />
                <input type="number" value={keywordsMax} onChange={(e) => setKeywordsMax(e.target.value)} placeholder="Max" style={{ ...inputFilterStyle, flex: 1 }} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 12 }}>
            <button
              onClick={() => setFilterOpen(false)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 500,
                background: 'transparent', color: 'var(--color-text-secondary)',
                border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => setFilterOpen(false)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 500,
                background: 'var(--color-blue-600)', color: '#fff',
                border: 'none', borderRadius: 'var(--border-radius-md)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--color-blue-800)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--color-blue-600)'}
            >
              Apply filters
            </button>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 480 }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
              <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('page')}>Page{sortArrow('page')}</th>
              <th style={{ ...thStyle, textAlign: 'right', cursor: 'pointer', width: 120 }} onClick={() => handleSort('organicTraffic')}>Organic Traffic{sortArrow('organicTraffic')}</th>
              <th style={{ ...thStyle, textAlign: 'right', cursor: 'pointer', width: 100 }} onClick={() => handleSort('keywords')}>Keywords{sortArrow('keywords')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              <tr key={i} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                <td style={{ padding: '8px 12px', color: 'var(--color-text-primary)', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.url || p.page ? (
                    <a href={p.url || p.page} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-blue-600)', textDecoration: 'none' }}>
                      {p.url || p.page}
                    </a>
                  ) : (
                    <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>
                  )}
                </td>
                <td style={{ padding: '8px 4px', textAlign: 'right', color: 'var(--color-text-primary)' }}>{p.organicTraffic?.toLocaleString?.() || p.organicTraffic || 0}</td>
                <td style={{ padding: '8px 4px', textAlign: 'right', color: 'var(--color-text-primary)' }}>{p.keywords?.toLocaleString?.() || p.keywords || 0}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                  No pages found. Try adjusting your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
  marginBottom: 4,
};

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 13,
  border: '0.5px solid var(--color-border-tertiary)',
  borderRadius: 'var(--border-radius-md)',
  background: 'var(--color-background-primary)',
  color: 'var(--color-text-primary)',
};

const thStyle = {
  padding: '10px 12px',
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
