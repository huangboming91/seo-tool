'use client';

import { useState } from 'react';

export default function ResearchParams({ onSearch, running, progress, complete }) {
  const [keyword, setKeyword] = useState('');
  const [numResults, setNumResults] = useState(10);
  const [language, setLanguage] = useState('English');
  const [country, setCountry] = useState('United States');
  const [pageType, setPageType] = useState('All types');
  const [userType, setUserType] = useState('B2B');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    onSearch({
      keyword: keyword.trim(),
      numResults,
      language,
      country,
      pageType,
      userType,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        padding: 20,
      }}>
        <h2 style={{
          fontSize: 14,
          fontWeight: 500,
          marginBottom: 16,
          color: 'var(--color-text-primary)',
        }}>
          Research parameters
        </h2>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Seed keyword</label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. best CRM software"
            disabled={running}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Number of results</label>
          <input
            type="number"
            value={numResults}
            onChange={(e) => setNumResults(Number(e.target.value))}
            min={1}
            max={100}
            disabled={running}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={running} style={inputStyle}>
              <option>English</option>
              <option>Chinese</option>
              <option>Spanish</option>
              <option>German</option>
              <option>French</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Country</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)} disabled={running} style={inputStyle}>
              <option>United States</option>
              <option>United Kingdom</option>
              <option>China</option>
              <option>Germany</option>
              <option>Australia</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Page type</label>
          <select value={pageType} onChange={(e) => setPageType(e.target.value)} disabled={running} style={inputStyle}>
            <option>All types</option>
            <option>Article</option>
            <option>Product page</option>
            <option>Blog post</option>
            <option>Landing page</option>
            <option>Category page</option>
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>User type</label>
          <div style={{ display: 'flex', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
            {['B2B', 'B2C'].map((type) => (
              <button
                key={type}
                type="button"
                disabled={running}
                onClick={() => setUserType(type)}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  fontSize: 12,
                  fontWeight: 500,
                  border: 'none',
                  background: userType === type ? 'var(--color-blue-600)' : 'var(--color-background-primary)',
                  color: userType === type ? '#fff' : 'var(--color-text-secondary)',
                  cursor: running ? 'not-allowed' : 'pointer',
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={running || !keyword.trim()}
          style={{
            width: '100%',
            padding: 10,
            fontSize: 13,
            fontWeight: 500,
            background: running ? 'var(--color-border-tertiary)' : 'var(--color-blue-600)',
            color: running ? 'var(--color-text-tertiary)' : '#fff',
            border: 'none',
            borderRadius: 'var(--border-radius-md)',
            cursor: running ? 'not-allowed' : 'pointer',
            marginTop: 18,
          }}
          onMouseEnter={(e) => {
            if (!running) e.target.style.background = 'var(--color-blue-800)';
          }}
          onMouseLeave={(e) => {
            if (!running) e.target.style.background = 'var(--color-blue-600)';
          }}
        >
          {running ? 'Searching...' : 'Run search'}
        </button>

        {running && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              width: '100%',
              height: 6,
              background: 'var(--color-background-secondary)',
              borderRadius: 3,
              overflow: 'hidden',
              marginBottom: 6,
            }}>
              <div style={{
                height: '100%',
                width: `${progress.pct}%`,
                background: 'var(--color-green-600)',
                borderRadius: 3,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              {progress.label}
            </div>
          </div>
        )}

        {complete && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 12,
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--color-text-success)',
          }}>
            Research complete
          </div>
        )}

        <div style={{
          marginTop: 14,
          padding: 10,
          background: 'var(--color-background-secondary)',
          borderRadius: 'var(--border-radius-md)',
          fontSize: 11,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.5,
        }}>
          Data source: <strong style={{ color: 'var(--color-text-primary)' }}>DataForSEO</strong> (pay-as-you-go). Est. cost per search: <strong style={{ color: 'var(--color-text-primary)' }}>$0.006</strong> (10 SERP results)
        </div>
      </div>
    </form>
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
