'use client';

import { useState, useEffect } from 'react';
import ResearchParams from '@/components/ResearchParams';
import ResultsPanel from '@/components/ResultsPanel';
import PreviousAudits from '@/components/PreviousAudits';

export default function Home() {
  const [searchState, setSearchState] = useState({
    running: false,
    complete: false,
    progress: { pct: 0, label: '' },
    results: null,
    error: null,
  });
  const [history, setHistory] = useState([]);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('seo-keyword-research-history');
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load keyword research history:', e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('seo-keyword-research-history', JSON.stringify(history));
  }, [history]);

  const handleSearch = async (params) => {
    setKeyword(params.keyword || '');
    setSearchState({
      running: true,
      complete: false,
      progress: { pct: 0, label: 'Querying search results...' },
      results: null,
      error: null,
    });

    const steps = [
      { pct: 5, label: 'Querying search results...' },
      { pct: 25, label: 'Extracting page metadata...' },
      { pct: 50, label: 'Analyzing keywords...' },
      { pct: 75, label: 'Clustering themes...' },
      { pct: 90, label: 'Building results...' },
    ];

    let currentStep = 0;
    const progressInterval = setInterval(() => {
      if (currentStep < steps.length) {
        setSearchState((prev) => ({
          ...prev,
          progress: steps[currentStep],
        }));
        currentStep++;
      }
    }, 600);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json();

      clearInterval(progressInterval);

      if (!res.ok) {
        setSearchState({
          running: false,
          complete: false,
          progress: { pct: 0, label: '' },
          results: null,
          error: data.error || 'Search failed',
        });
        return;
      }

      setSearchState({
        running: false,
        complete: true,
        progress: { pct: 100, label: 'Building results...' },
        results: data,
        error: null,
      });

      const record = {
        id: `kw-${Date.now()}`,
        target: params.keyword,
        date: new Date().toISOString(),
        status: 'done',
        country: params.country,
        language: params.language,
        results: data,
      };
      setHistory((prev) => [record, ...prev].slice(0, 20));
    } catch (err) {
      clearInterval(progressInterval);
      setSearchState({
        running: false,
        complete: false,
        progress: { pct: 0, label: '' },
        results: null,
        error: err.message || 'Network error',
      });
    }
  };

  const loadHistory = (record) => {
    setKeyword(record.target || '');
    setSearchState({
      running: false,
      complete: true,
      progress: { pct: 100, label: 'Loaded from history' },
      results: record.results,
      error: null,
    });
  };

  const deleteHistory = (id) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const clearHistory = () => {
    if (typeof window !== 'undefined' && window.confirm('Clear all keyword research history?')) {
      setHistory([]);
    }
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
        paddingBottom: 20,
        borderBottom: '0.5px solid var(--color-border-tertiary)',
      }}>
        <h1 style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)' }}>
          SEO Keyword Research
        </h1>
        <span style={{
          fontSize: 11,
          padding: '2px 8px',
          borderRadius: 'var(--border-radius-md)',
          background: 'var(--color-background-info)',
          color: 'var(--color-text-info)',
        }}>
          v1.0
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: 24,
        alignItems: 'start',
      }}>
        <ResearchParams
          onSearch={handleSearch}
          running={searchState.running}
          progress={searchState.progress}
          complete={searchState.complete}
        />

        <div>
          <ResultsPanel
            complete={searchState.complete}
            results={searchState.results}
            error={searchState.error}
            keyword={keyword}
          />

          <div style={{
            display: 'flex',
            gap: 10,
            marginTop: 20,
            paddingTop: 16,
            borderTop: '0.5px solid var(--color-border-tertiary)',
          }}>
            <button
              disabled={!searchState.complete}
              onClick={() => handleExport('xlsx', searchState.results)}
              style={{
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 500,
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: 'var(--border-radius-md)',
                background: 'var(--color-background-primary)',
                color: searchState.complete ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                cursor: searchState.complete ? 'pointer' : 'not-allowed',
              }}
            >
              &#8595; Export XLSX
            </button>
            <button
              disabled={!searchState.complete}
              onClick={() => handleExport('csv', searchState.results)}
              style={{
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 500,
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: 'var(--border-radius-md)',
                background: 'var(--color-background-primary)',
                color: searchState.complete ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                cursor: searchState.complete ? 'pointer' : 'not-allowed',
              }}
            >
              &#8595; Export CSV
            </button>
          </div>

          <PreviousAudits
            title="Previous Audits"
            items={history}
            columns={[
              { key: 'target', label: 'Keyword' },
              { key: 'country', label: 'Country' },
              { key: 'language', label: 'Language' },
            ]}
            onSelect={loadHistory}
            onDelete={deleteHistory}
            onClear={clearHistory}
          />
        </div>
      </div>
    </div>
  );
}

async function handleExport(format, results) {
  if (!results) return;
  try {
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, ...results }),
    });

    if (!res.ok) throw new Error('Export failed');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = format === 'xlsx'
      ? 'seo-research-results.xlsx'
      : 'seo-research-results.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert('Export failed: ' + (err.message || 'Unknown error'));
  }
}
