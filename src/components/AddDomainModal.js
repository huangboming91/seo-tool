'use client';

import { useState } from 'react';

const COUNTRIES = [
  { value: 'world', label: 'World' },
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

const LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'german', label: 'German' },
  { value: 'french', label: 'French' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'portuguese', label: 'Portuguese' },
  { value: 'italian', label: 'Italian' },
  { value: 'russian', label: 'Russian' },
  { value: 'korean', label: 'Korean' },
  { value: 'arabic', label: 'Arabic' },
  { value: 'dutch', label: 'Dutch' },
  { value: 'turkish', label: 'Turkish' },
  { value: 'polish', label: 'Polish' },
  { value: 'swedish', label: 'Swedish' },
  { value: 'indonesian', label: 'Indonesian' },
  { value: 'hindi', label: 'Hindi' },
];

const SEARCH_DEPTH_OPTIONS = [
  { value: 1, label: '1 page (top 10 results)' },
  { value: 2, label: '2 pages (top 20 results)' },
  { value: 3, label: '3 pages (top 30 results)' },
  { value: 4, label: '4 pages (top 40 results)' },
  { value: 5, label: '5 pages (top 50 results)' },
  { value: 6, label: '6 pages (top 60 results)' },
  { value: 7, label: '7 pages (top 70 results)' },
  { value: 8, label: '8 pages (top 80 results)' },
  { value: 9, label: '9 pages (top 90 results)' },
  { value: 10, label: '10 pages (top 100 results)' },
];

export default function AddDomainModal({ onClose, onSubmit, loading }) {
  const [domain, setDomain] = useState('');
  const [country, setCountry] = useState('world');
  const [searchTargeting, setSearchTargeting] = useState('national');
  const [language, setLanguage] = useState('english');
  const [device, setDevice] = useState('desktop+mobile');
  const [schedule, setSchedule] = useState('weekly');
  const [searchDepth, setSearchDepth] = useState(4);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!domain.trim()) return;
    onSubmit({
      domain: domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
      country,
      searchTargeting,
      language,
      device,
      schedule,
      searchDepth,
    });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
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
        width: 480,
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflowY: 'auto',
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
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>
            Add Domain
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
            color: 'var(--color-text-secondary)', lineHeight: 1, padding: 0,
          }}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Target domain</label>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Country</label>
              <select value={country} onChange={(e) => setCountry(e.target.value)} disabled={loading} style={inputStyle}>
                {COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Language</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={loading} style={inputStyle}>
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Search targeting</label>
              <div style={{
                display: 'flex', border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: 'var(--border-radius-md)', overflow: 'hidden',
              }}>
                {['national', 'local'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={loading}
                    onClick={() => setSearchTargeting(opt)}
                    style={{
                      flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 500,
                      border: 'none', textTransform: 'capitalize',
                      background: searchTargeting === opt ? 'var(--color-blue-600)' : 'var(--color-background-primary)',
                      color: searchTargeting === opt ? '#fff' : 'var(--color-text-secondary)',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Device</label>
              <select value={device} onChange={(e) => setDevice(e.target.value)} disabled={loading} style={inputStyle}>
                <option value="desktop+mobile">Desktop + Mobile</option>
                <option value="desktop">Desktop only</option>
                <option value="mobile">Mobile only</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Schedule</label>
              <select value={schedule} onChange={(e) => setSchedule(e.target.value)} disabled={loading} style={inputStyle}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly (end of month)</option>
                <option value="manual">Manual only</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Search depth</label>
              <select value={searchDepth} onChange={(e) => setSearchDepth(Number(e.target.value))} disabled={loading} style={inputStyle}>
                {SEARCH_DEPTH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
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
            {loading ? 'Discovering keywords...' : 'Add Domain'}
          </button>
        </form>
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
