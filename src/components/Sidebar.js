'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

const modules = [
  {
    section: 'Research',
    items: [
      { id: 'keyword-research', label: 'Keyword Research', icon: '\u{1F50D}', path: '/' },
      { id: 'rank-tracking', label: 'Rank Tracking', icon: '\u{1F4C8}', path: '/rank-tracking' },
      { id: 'domain-overview', label: 'Domain Overview', icon: '\u{1F310}', path: '/domain-overview' },
    ],
  },
  {
    section: 'Analysis',
    items: [
      { id: 'brand-lookup', label: 'Brand Lookup', icon: '\u{1F9EE}', path: '/brand-lookup' },
      { id: 'backlinks', label: 'Backlinks', icon: '\u{1F517}', path: '/backlinks' },
      { id: 'site-audit', label: 'Site Audits', icon: '\u{2705}', path: '/site-audit' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, quota, logout } = useAuth();

  const isActive = (mod) => {
    if (mod.id === 'keyword-research') return pathname === '/';
    return pathname.startsWith(mod.path);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
    router.refresh();
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

      {/* User section at bottom */}
      <div style={{
        borderTop: '0.5px solid var(--color-border-tertiary)',
        padding: '12px 16px',
      }}>
        {/* Admin Panel link (admin only) */}
        {user?.role === 'admin' && (
          <button
            onClick={() => router.push('/admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 0 10px',
              marginBottom: 10,
              fontSize: 13,
              color: pathname === '/admin' ? 'var(--color-text-info)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              border: 'none',
              borderBottom: '0.5px solid var(--color-border-tertiary)',
              background: 'transparent',
              width: '100%',
              textAlign: 'left',
              fontWeight: pathname === '/admin' ? 500 : 400,
            }}
          >
            <span style={{ width: 16, textAlign: 'center', fontSize: 13 }}>{'\u{1F6E0}'}</span>
            Admin Panel
          </button>
        )}

        {user ? (
          <>
            <div style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              marginBottom: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {user.display_name}
            </div>
            <div style={{
              fontSize: 10,
              color: 'var(--color-text-tertiary)',
              marginBottom: 6,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {user.email}
            </div>
            {user.role !== 'admin' && quota && (
              <div style={{
                fontSize: 10,
                color: 'var(--color-text-tertiary)',
                marginBottom: 8,
              }}>
                Quota: {quota.remaining}/{quota.daily_limit} left today
              </div>
            )}
            <button
              onClick={handleLogout}
              style={{
                fontSize: 11,
                color: 'var(--color-text-tertiary)',
                cursor: 'pointer',
                border: 'none',
                background: 'transparent',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <button
            onClick={() => router.push('/login')}
            style={{
              fontSize: 12,
              color: 'var(--color-text-info)',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              padding: 0,
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            {'\u{1F464}'} Sign In
          </button>
        )}

        {/* Copyright */}
        <div style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: '0.5px solid var(--color-border-tertiary)',
          fontSize: 10,
          color: 'var(--color-text-tertiary)',
        }}>
          © 2026 MingWong
        </div>
      </div>
    </aside>
  );
}
