'use client';

import { useState } from 'react';

export default function ResultsPanel({ complete, results, error }) {
  const [tab, setTab] = useState('serp');
  const [serpSort, setSerpSort] = useState({ col: 'rank', asc: true });
  const [kwSort, setKwSort] = useState({ col: 'keyword', asc: true });

  const tabs = [
    { id: 'serp', label: 'SERP pages', count: results?.serp_pages?.length || 0 },
    { id: 'keywords', label: 'Keywords', count: results?.keywords?.length || 0 },
    { id: 'clusters', label: 'Theme clusters', count: results?.clusters?.length || 0 },
    { id: 'sheets', label: 'Sheet tabs', count: null },
  ];

  if (error) {
    return (
      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-danger)',
        borderRadius: 'var(--border-radius-lg)',
        padding: '40px 20px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-danger)', marginBottom: 8 }}>
          Search failed
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: tab === t.id ? 500 : 400,
              color: tab === t.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--color-blue-600)' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            {t.label}
            {t.count !== null && (
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 4 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {!complete && !error && (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              Enter parameters and run search
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              Click column headers to sort results after search completes
            </div>
          </div>
        )}

        {complete && tab === 'serp' && (
          <SerpTable data={results?.serp_pages || []} sort={serpSort} onSort={setSerpSort} />
        )}

        {complete && tab === 'keywords' && (
          <KeywordsTable data={results?.keywords || []} sort={kwSort} onSort={setKwSort} />
        )}

        {complete && tab === 'clusters' && (
          <ClustersList data={results?.clusters || []} />
        )}

        {complete && tab === 'sheets' && (
          <SheetsPreview />
        )}
      </div>
    </div>
  );
}

function sortData(data, col, asc) {
  return [...data].sort((a, b) => {
    const va = a[col];
    const vb = b[col];
    if (typeof va === 'number') return asc ? va - vb : vb - va;
    if (typeof va === 'string') return asc ? va.localeCompare(vb) : vb.localeCompare(va);
    return 0;
  });
}

function SortHeader({ label, col, sort, onSort, width }) {
  const active = sort.col === col;
  return (
    <th
      onClick={() => onSort({ col, asc: active ? !sort.asc : true })}
      style={{
        textAlign: 'left',
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--color-text-primary)',
        padding: '10px 12px 8px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        background: 'var(--color-background-secondary)',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        width: width || 'auto',
        position: 'sticky',
        top: 0,
      }}
    >
      {label}
      <span style={{ fontSize: 10, marginLeft: 3, color: active ? 'var(--color-text-info)' : 'var(--color-text-tertiary)' }}>
        {active ? (sort.asc ? '\u25B2' : '\u25BC') : '\u25B2\u25BC'}
      </span>
    </th>
  );
}

function SerpTable({ data, sort, onSort }) {
  const sorted = sortData(data, sort.col, sort.asc);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      {data.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
          No SERP pages found for this query.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr>
              <SortHeader label="Rank" col="rank" sort={sort} onSort={onSort} width={50} />
              <SortHeader label="Page Title" col="title" sort={sort} onSort={onSort} width={200} />
              <SortHeader label="URL" col="url" sort={sort} onSort={onSort} width={180} />
              <SortHeader label="H1" col="h1" sort={sort} onSort={onSort} width={150} />
              <SortHeader label="Meta" col="meta" sort={sort} onSort={onSort} />
              <SortHeader label="Type" col="type" sort={sort} onSort={onSort} width={90} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i}>
                <td style={tdStyle}>{row.rank}</td>
                <td style={{ ...tdStyle, fontSize: 13 }}>{row.title}</td>
                <td style={{ ...tdStyle, fontSize: 12, color: 'var(--color-text-info)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <a href={row.url.startsWith('http') ? row.url : `https://${row.url}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                    {row.url}
                  </a>
                </td>
                <td style={{ ...tdStyle, fontSize: 12 }}>{row.h1}</td>
                <td style={{ ...tdStyle, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {row.meta && row.meta.length > 80 ? row.meta.slice(0, 80) + '...' : row.meta}
                </td>
                <td style={tdStyle}>
                  <span style={{
                    display: 'inline-block',
                    fontSize: 11,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: row.type === 'article' ? 'var(--color-background-info)' :
                               row.type === 'blog' ? 'var(--color-background-warning)' :
                               'var(--color-background-success)',
                    color: row.type === 'article' ? 'var(--color-text-info)' :
                           row.type === 'blog' ? 'var(--color-text-warning)' :
                           'var(--color-text-success)',
                  }}>
                    {row.type}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function KeywordsTable({ data, sort, onSort }) {
  const sorted = sortData(data, sort.col, sort.asc);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      {data.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
          No keywords extracted from this search.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead>
            <tr>
              <SortHeader label="Keyword" col="keyword" sort={sort} onSort={onSort} />
              <SortHeader label="Type" col="keyword_type" sort={sort} onSort={onSort} width={95} />
              <SortHeader label="Cluster" col="theme_cluster" sort={sort} onSort={onSort} width={110} />
              <SortHeader label="Page Type" col="suggested_page_type" sort={sort} onSort={onSort} width={100} />
              <SortHeader label="Slug" col="slug" sort={sort} onSort={onSort} width={150} />
              <SortHeader label="Basis" col="data_basis" sort={sort} onSort={onSort} width={90} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i}>
                <td style={{ ...tdStyle, fontSize: 13 }}>{row.keyword}</td>
                <td style={{ ...tdStyle, fontSize: 12, color: 'var(--color-text-secondary)' }}>{row.keyword_type}</td>
                <td style={{ ...tdStyle, fontSize: 12 }}>{row.theme_cluster}</td>
                <td style={{ ...tdStyle, fontSize: 12 }}>{row.suggested_page_type}</td>
                <td style={{ ...tdStyle, fontSize: 12, color: 'var(--color-text-tertiary)' }}>/{row.slug}</td>
                <td style={{ ...tdStyle, fontSize: 11, color: 'var(--color-text-tertiary)' }}>{row.data_basis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ClustersList({ data }) {
  if (data.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
        No theme clusters identified.
      </div>
    );
  }

  return (
    <div>
      {data.map((c, i) => {
        const colorMap = {
          high: { bg: 'var(--color-background-danger)', fg: 'var(--color-text-danger)' },
          medium: { bg: 'var(--color-background-warning)', fg: 'var(--color-text-warning)' },
          low: { bg: 'var(--color-background-info)', fg: 'var(--color-text-info)' },
        };
        const colors = colorMap[c.priority] || colorMap.low;

        return (
          <div key={i} style={{
            padding: '14px 16px',
            borderBottom: i < data.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {c.cluster_name}
              </span>
              <span style={{
                fontSize: 11,
                padding: '1px 8px',
                borderRadius: 10,
                fontWeight: 500,
                background: colors.bg,
                color: colors.fg,
              }}>
                {c.priority}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
              <span style={{ marginRight: 14 }}>Primary: {c.primary_keyword}</span>
              <span>Slug: /{c.slug}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Supporting: {c.supporting_keywords}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SheetsPreview() {
  const sheets = [
    {
      name: 'serp_pages',
      cols: ['Rank', 'Page Title', 'URL', 'H1', 'Meta', 'Page Type'],
    },
    {
      name: 'keywords',
      cols: ['keyword', 'keyword_type', 'theme_cluster', 'suggested_page_type', 'slug', 'data_basis', 'related_search', 'related_questions'],
    },
    {
      name: 'clusters',
      cols: ['cluster_name', 'primary_keyword', 'supporting_keywords', 'slug', 'priority'],
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      {sheets.map((sheet, i) => (
        <div key={i} style={{ marginBottom: i < sheets.length - 1 ? 16 : 0 }}>
          <h3 style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 8 }}>
            Sheet {i + 1} &mdash; {sheet.name}
          </h3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {sheet.cols.map((col) => (
              <span key={col} style={{
                fontSize: 11,
                padding: '3px 8px',
                background: 'var(--color-background-secondary)',
                borderRadius: 4,
                color: 'var(--color-text-secondary)',
              }}>
                {col}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const tdStyle = {
  fontSize: 13,
  color: 'var(--color-text-primary)',
  padding: '8px 12px',
  borderBottom: '0.5px solid var(--color-border-tertiary)',
};
