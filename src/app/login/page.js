'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (searchParams.get('registered') === '1') {
      setSuccess('Account created. Please sign in.');
    }
    // If already logged in, redirect
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (data.user) {
        router.push(data.user.role === 'admin' ? '/admin' : '/');
      }
    });
  }, [router, searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      router.push(data.role === 'admin' ? '/admin' : '/');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-background-tertiary)',
    }}>
      <div style={{
        width: 380,
        background: 'var(--color-background-primary)',
        borderRadius: 'var(--border-radius-lg)',
        border: '0.5px solid var(--color-border-tertiary)',
        padding: '32px 28px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            SEO Platform
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            Sign in to your account
          </div>
        </div>

        {error && (
          <div style={{
            background: 'var(--color-background-danger)',
            color: 'var(--color-text-danger)',
            padding: '8px 12px',
            borderRadius: 'var(--border-radius-md)',
            fontSize: 12,
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {success && !error && (
          <div style={{
            background: 'var(--color-background-success)',
            color: 'var(--color-text-success)',
            padding: '8px 12px',
            borderRadius: 'var(--border-radius-md)',
            fontSize: 12,
            marginBottom: 16,
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
              marginBottom: 4,
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@seotool.com"
              required
              autoFocus
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: 'var(--border-radius-md)',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
              marginBottom: 4,
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: 'var(--border-radius-md)',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '9px 16px',
              background: loading ? 'var(--color-border-tertiary)' : 'var(--color-blue-800)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--border-radius-md)',
              fontSize: 13,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: '0.5px solid var(--color-border-tertiary)',
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--color-text-tertiary)',
        }}>
          Don&apos;t have an account?{' '}
          <a href="/register" style={{
            color: 'var(--color-text-info)',
            textDecoration: 'none',
            fontWeight: 500,
          }}>
            Sign Up
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
