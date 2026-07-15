'use client';

export default function SerpAnalysisPanel({ data, keyword }) {
  const results = data || [];

  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          SERP Analysis
          {keyword && (
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 400 }}>
              {keyword}
            </span>
          )}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 12,
          color: 'var(--color-text-secondary)',
        }}>
          <span>{results.length} organic results</span>
          <button
            onClick={() => exportToSheets(results)}
            disabled={results.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 500,
              border: '0.5px solid var(--color-border-tertiary)',
              borderRadius: 'var(--border-radius-md)',
              background: 'var(--color-background-primary)',
              color: results.length ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              cursor: results.length ? 'pointer' : 'not-allowed',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
              <path d="M10 9H8" />
            </svg>
            Export to Sheets
          </button>
        </div>
      </div>

      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {results.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: 'var(--color-text-tertiary)',
            fontSize: 13,
          }}>
            No SERP results available.
          </div>
        ) : (
          <div>
            {results.map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 16px',
                  borderBottom: i < results.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none',
                }}
              >
                <div style={{
                  minWidth: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--border-radius-md)',
                  background: 'var(--color-background-secondary)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  marginTop: 2,
                }}>
                  {row.rank}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <a
                    href={row.url.startsWith('http') ? row.url : `https://${row.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--color-text-primary)',
                      textDecoration: 'none',
                      marginBottom: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={row.title}
                  >
                    {row.title}
                  </a>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--color-text-info)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {row.url}
                  </div>
                  {row.meta && (
                    <div style={{
                      fontSize: 12,
                      color: 'var(--color-text-secondary)',
                      marginTop: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {row.meta}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function exportToSheets(results) {
  if (!results.length || typeof window === 'undefined') return;

  const csv = [
    ['Rank', 'Title', 'URL', 'Page Type'].join(','),
    ...results.map((r) => [
      r.rank,
      `"${(r.title || '').replace(/"/g, '""')}"`,
      `"${(r.url || '').replace(/"/g, '""')}"`,
      r.type || '',
    ].join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'serp-analysis.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
