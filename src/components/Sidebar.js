'use client';

import { usePathname, useRouter } from 'next/navigation';

const modules = [
  {
    section: 'Research',
    items: [
      { id: 'keyword-research', label: 'Keyword Research', icon: '\u{1F50D}', path: '/' },
      { id: 'rank-tracking', label: 'Rank Tracking', icon: '\u{1F4C8}', path: '/rank-tracking' },
    ],
  },
  {
    section: 'Analysis',
    items: [
      { id: 'competitor-insights', label: 'Competitor Insights', icon: '\u{2694}', path: '/competitor-insights' },
      { id: 'ai-visibility', label: 'AI Visibility', icon: '\u{269B}', path: '/ai-visibility' },
      { id: 'backlinks', label: 'Backlinks', icon: '\u{1F517}', path: '/backlinks' },
      { id: 'site-audit', label: 'Site Audits', icon: '\u{2705}', path: '/site-audit' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (mod) => {
    if (mod.id === 'keyword-research') return pathname === '/';
    return pathname.startsWith(mod.path);
  };

  return (
    <aside style={{
      width: 200,
      minWidth: 200,
      borderRight: '0.5px solid var(--color-border-tertiary)',
      background: 'var(--color-background-primary)',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 0',
    }}>
      <div style={{
        fontSize: 14,
        fontWeight: 500,
        padding: '0 16px 16px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        marginBottom: 8,
        color: 'var(--color-text-primary)',
      }}>
        SEO Platform
      </div>

      {modules.map((group) => (
        <div key={group.section}>
          <div style={{
            fontSize: 10,
            fontWeight: 500,
            color: 'var(--color-text-tertiary)',
            padding: '12px 16px 4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {group.section}
          </div>
          {group.items.map((mod) => (
            <button
              key={mod.id}
              onClick={() => router.push(mod.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 16px',
                fontSize: 13,
                color: isActive(mod) ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                border: 'none',
                background: isActive(mod) ? 'var(--color-background-info)' : 'transparent',
                width: '100%',
                textAlign: 'left',
                fontWeight: isActive(mod) ? 500 : 400,
              }}
              onMouseEnter={(e) => {
                if (!isActive(mod)) e.target.style.background = 'var(--color-background-secondary)';
              }}
              onMouseLeave={(e) => {
                if (!isActive(mod)) e.target.style.background = 'transparent';
              }}
            >
              <span style={{ width: 16, textAlign: 'center', fontSize: 13 }}>{mod.icon}</span>
              {mod.label}
            </button>
          ))}
        </div>
      ))}

      <div style={{ flex: 1 }} />
      <div style={{
        padding: '12px 16px',
        fontSize: 11,
        color: 'var(--color-text-tertiary)',
        borderTop: '0.5px solid var(--color-border-tertiary)',
      }}>
        Powered by DataForSEO
      </div>
    </aside>
  );
}
