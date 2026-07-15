'use client';

import { useState, useEffect } from 'react';
import AddDomainModal from '@/components/AddDomainModal';
import KeywordSelectionModal from '@/components/KeywordSelectionModal';
import RankTrackingDashboard from '@/components/RankTrackingDashboard';
import PreviousAudits from '@/components/PreviousAudits';

export default function RankTrackingPage() {
  const [domains, setDomains] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [view, setView] = useState('list');
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showKeywordModal, setShowKeywordModal] = useState(false);
  const [discoveredKeywords, setDiscoveredKeywords] = useState([]);
  const [currentDomainConfig, setCurrentDomainConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const savedDomains = localStorage.getItem('seo-rank-tracking-domains');
      const savedKeywords = localStorage.getItem('seo-rank-tracking-keywords');
      if (savedDomains) setDomains(JSON.parse(savedDomains));
      if (savedKeywords) setKeywords(JSON.parse(savedKeywords));
    } catch (e) {
      console.error('Failed to load rank tracking data:', e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('seo-rank-tracking-domains', JSON.stringify(domains));
  }, [domains]);

  useEffect(() => {
    localStorage.setItem('seo-rank-tracking-keywords', JSON.stringify(keywords));
  }, [keywords]);

  const handleAddDomain = async (config) => {
    setLoading(true);
    setError(null);
    setCurrentDomainConfig(config);

    try {
      const res = await fetch('/api/rank-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'discover',
          target: config.domain,
          country: config.country,
          language: config.language,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to discover keywords');
        setLoading(false);
        return;
      }

      setDiscoveredKeywords(data.keywords || []);
      setShowAddModal(false);
      setShowKeywordModal(true);
      setLoading(false);
    } catch (e) {
      setError(e.message || 'Network error');
      setLoading(false);
    }
  };

  const handleSaveKeywords = (selectedKeywords) => {
    if (!currentDomainConfig) return;

    const isExistingDomain = !!currentDomainConfig.id;

    if (isExistingDomain) {
      // Adding keywords to existing domain
      const existingKeywordSet = new Set(
        keywords.filter((k) => k.domainId === currentDomainConfig.id).map((k) => k.keyword)
      );
      const newKeywords = selectedKeywords
        .filter((kw) => !existingKeywordSet.has(kw.keyword))
        .map((kw, i) => ({
          id: `kw-${Date.now()}-${i}`,
          domainId: currentDomainConfig.id,
          keyword: kw.keyword,
          position: String(kw.position || '-'),
          volume: kw.volume || 0,
          traffic: kw.traffic || 0,
          url: kw.url || '',
          checkedAt: new Date().toISOString(),
          previousPosition: '-',
        }));
      setKeywords((prev) => [...prev, ...newKeywords]);
      setShowKeywordModal(false);
      setDiscoveredKeywords([]);
      setCurrentDomainConfig(null);
      return;
    }

    // Creating new domain
    const domainId = `domain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newDomain = {
      id: domainId,
      ...currentDomainConfig,
      createdAt: new Date().toISOString(),
    };

    const newKeywords = selectedKeywords.map((kw, i) => ({
      id: `kw-${Date.now()}-${i}`,
      domainId,
      keyword: kw.keyword,
      position: String(kw.position || '-'),
      volume: kw.volume || 0,
      traffic: kw.traffic || 0,
      url: kw.url || '',
      checkedAt: new Date().toISOString(),
      previousPosition: '-',
    }));

    setDomains((prev) => [...prev, newDomain]);
    setKeywords((prev) => [...prev, ...newKeywords]);
    setShowKeywordModal(false);
    setDiscoveredKeywords([]);
    setCurrentDomainConfig(null);
    setView('detail');
    setSelectedDomain(newDomain);
  };

  const handleCheckNow = async () => {
    if (!selectedDomain) return;
    const domainKeywords = keywords.filter((k) => k.domainId === selectedDomain.id);
    if (domainKeywords.length === 0) return;

    setChecking(true);
    setError(null);

    try {
      const res = await fetch('/api/rank-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check',
          keywords: domainKeywords.map((k) => ({ keyword: k.keyword, volume: k.volume, position: k.position })),
          domain: selectedDomain.domain,
          country: selectedDomain.country,
          language: selectedDomain.language,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to check rankings');
        setChecking(false);
        return;
      }

      setKeywords((prev) => {
        return prev.map((k) => {
          if (k.domainId !== selectedDomain.id) return k;
          const result = data.results?.find((r) => r.keyword === k.keyword);
          if (!result) return k;
          return {
            ...k,
            previousPosition: k.position,
            position: result.position || '-',
            url: result.url || k.url,
            checkedAt: new Date().toISOString(),
          };
        });
      });

      setChecking(false);
    } catch (e) {
      setError(e.message || 'Network error');
      setChecking(false);
    }
  };

  const getDomainKeywords = (domainId) => {
    return keywords.filter((k) => k.domainId === domainId);
  };

  const handleDeleteDomain = (domainId) => {
    if (typeof window !== 'undefined' && !window.confirm('Delete this domain and all its tracked keywords?')) return;
    setDomains((prev) => prev.filter((d) => d.id !== domainId));
    setKeywords((prev) => prev.filter((k) => k.domainId !== domainId));
    if (selectedDomain?.id === domainId) {
      setSelectedDomain(null);
      setView('list');
    }
  };

  const clearAllDomains = () => {
    if (typeof window !== 'undefined' && window.confirm('Delete all domains and tracked keywords?')) {
      setDomains([]);
      setKeywords([]);
      setSelectedDomain(null);
      setView('list');
    }
  };

  const historyItems = domains.map((d) => ({
    id: d.id,
    target: d.domain,
    date: d.createdAt || new Date().toISOString(),
    status: 'done',
    country: d.country,
    keywordsCount: getDomainKeywords(d.id).length,
  }));

  const handleAddMoreKeywords = () => {
    if (!selectedDomain) return;
    setCurrentDomainConfig(selectedDomain);
    setDiscoveredKeywords([]);
    setShowKeywordModal(false);
    setShowAddModal(false);

    setLoading(true);
    fetch('/api/rank-tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'discover',
        target: selectedDomain.domain,
        country: selectedDomain.country,
        language: selectedDomain.language,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setDiscoveredKeywords(data.keywords || []);
        setShowKeywordModal(true);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || 'Network error');
        setLoading(false);
      });
  };

  // Empty state
  if (domains.length === 0) {
    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text-primary)' }}>
            Rank Tracking
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
            Track keyword positions across domains
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 20px',
          border: '1px dashed var(--color-border-tertiary)',
          borderRadius: 'var(--border-radius-lg)',
          background: 'var(--color-background-primary)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--color-background-info)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, marginBottom: 16,
          }}>
            📈
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text-primary)' }}>
            No domains tracked yet
          </h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 20px', textAlign: 'center', maxWidth: 360 }}>
            Add a domain to discover keywords it ranks for and start tracking their positions over time.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '10px 24px', fontSize: 13, fontWeight: 500,
              background: 'var(--color-blue-600)', color: '#fff',
              border: 'none', borderRadius: 'var(--border-radius-md)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.target.style.background = 'var(--color-blue-800)'}
            onMouseLeave={(e) => e.target.style.background = 'var(--color-blue-600)'}
          >
            + Add Domain
          </button>
        </div>

        {showAddModal && (
          <AddDomainModal
            onClose={() => setShowAddModal(false)}
            onSubmit={handleAddDomain}
            loading={loading}
          />
        )}
      </div>
    );
  }

  // List view
  if (view === 'list') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text-primary)' }}>
              Rank Tracking
            </h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
              Track keyword positions across domains
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 500,
              background: 'var(--color-blue-600)', color: '#fff',
              border: 'none', borderRadius: 'var(--border-radius-md)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.target.style.background = 'var(--color-blue-800)'}
            onMouseLeave={(e) => e.target.style.background = 'var(--color-blue-600)'}
          >
            + Add Domain
          </button>
        </div>

        {error && (
          <div style={{
            padding: 12, marginBottom: 16, borderRadius: 'var(--border-radius-md)',
            background: 'var(--color-background-danger)', color: 'var(--color-text-danger)', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gap: 12 }}>
          {domains.map((d) => {
            const dKeywords = getDomainKeywords(d.id);
            const topCount = dKeywords.filter((k) => k.position !== '-' && Number(k.position) <= 10).length;
            return (
              <div
                key={d.id}
                onClick={() => { setSelectedDomain(d); setView('detail'); }}
                style={{
                  background: 'var(--color-background-primary)',
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 'var(--border-radius-lg)',
                  padding: 20,
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-primary)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-tertiary)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px', color: 'var(--color-text-primary)' }}>
                      {d.domain}
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>
                      {dKeywords.length} keywords · {topCount} in top 10
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteDomain(d.id); }}
                    style={{
                      padding: '4px 10px', fontSize: 11, color: 'var(--color-text-danger)',
                      background: 'transparent', border: '0.5px solid var(--color-border-tertiary)',
                      borderRadius: 'var(--border-radius-md)', cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <PreviousAudits
          title="Previous Audits"
          items={historyItems}
          columns={[
            { key: 'target', label: 'Domain' },
            { key: 'country', label: 'Country' },
            { key: 'keywordsCount', label: 'Keywords', align: 'right' },
          ]}
          onSelect={(item) => {
            const d = domains.find((dm) => dm.id === item.id);
            if (d) { setSelectedDomain(d); setView('detail'); }
          }}
          onDelete={(id) => handleDeleteDomain(id)}
          onClear={clearAllDomains}
        />

        {showAddModal && (
          <AddDomainModal
            onClose={() => setShowAddModal(false)}
            onSubmit={handleAddDomain}
            loading={loading}
          />
        )}
      </div>
    );
  }

  // Detail view
  return (
    <div>
      {error && (
        <div style={{
          padding: 12, marginBottom: 16, borderRadius: 'var(--border-radius-md)',
          background: 'var(--color-background-danger)', color: 'var(--color-text-danger)', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {selectedDomain && (
        <RankTrackingDashboard
          domain={selectedDomain}
          keywords={getDomainKeywords(selectedDomain.id)}
          onBack={() => { setView('list'); setSelectedDomain(null); }}
          onCheck={handleCheckNow}
          onAddKeywords={handleAddMoreKeywords}
          checking={checking}
        />
      )}

      {showKeywordModal && (
        <KeywordSelectionModal
          keywords={discoveredKeywords}
          domain={currentDomainConfig?.domain || selectedDomain?.domain || ''}
          onClose={() => { setShowKeywordModal(false); setDiscoveredKeywords([]); }}
          onSave={handleSaveKeywords}
          loading={loading}
        />
      )}
    </div>
  );
}
