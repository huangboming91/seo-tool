'use client';

export default function KeywordMetricsSummary({ keyword, metrics }) {
  if (!metrics) return null;

  const { volume, cpc, competition, score, intent } = metrics;

  const formatNumber = (n) => new Intl.NumberFormat('en-US').format(n);
  const competitionLabel = (() => {
    const c = parseFloat(competition);
    if (c < 0.3) return { text: 'Low', color: 'var(--color-text-success)', bg: 'var(--color-background-success)' };
    if (c < 0.7) return { text: 'Medium', color: 'var(--color-text-warning)', bg: 'var(--color-background-warning)' };
    return { text: 'High', color: 'var(--color-text-danger)', bg: 'var(--color-background-danger)' };
  })();

  const scoreColor = (() => {
    const s = Number(score);
    if (s >= 70) return { fg: 'var(--color-text-success)', bg: 'var(--color-background-success)' };
    if (s >= 40) return { fg: 'var(--color-text-warning)', bg: 'var(--color-background-warning)' };
    return { fg: 'var(--color-text-danger)', bg: 'var(--color-background-danger)' };
  })();

  const intentStyle = (() => {
    const styles = {
      Info: { fg: 'var(--color-text-info)', bg: 'var(--color-background-info)' },
      Commercial: { fg: 'var(--color-text-warning)', bg: 'var(--color-background-warning)' },
      Navigational: { fg: 'var(--color-text-success)', bg: 'var(--color-background-success)' },
      Transactional: { fg: 'var(--color-text-danger)', bg: 'var(--color-background-danger)' },
    };
    return styles[intent] || styles.Info;
  })();

  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      padding: '16px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div>
          <h2 style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: '0 0 4px 0',
          }}>
            {keyword}
          </h2>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--color-text-secondary)',
          }}>
            Keyword metrics
          </div>
        </div>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '3px 10px',
          borderRadius: 10,
          background: intentStyle.bg,
          color: intentStyle.fg,
        }}>
          {intent}
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
        gap: 12,
      }}>
        <MetricBox
          label="Volume"
          value={formatNumber(volume)}
        />
        <MetricBox
          label="CPC"
          value={`$${cpc}`}
        />
        <MetricBox
          label="Comp."
          value={competition}
          subValue={competitionLabel.text}
          subColor={competitionLabel.color}
          subBg={competitionLabel.bg}
        />
        <MetricBox
          label="Score"
          value={score}
          subColor={scoreColor.fg}
          subBg={scoreColor.bg}
        />
      </div>
    </div>
  );
}

function MetricBox({ label, value, subValue, subColor, subBg }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: 11,
        color: 'var(--color-text-secondary)',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 18,
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        marginBottom: 2,
      }}>
        {value}
      </div>
      {subValue && (
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          padding: '1px 6px',
          borderRadius: 4,
          background: subBg,
          color: subColor,
        }}>
          {subValue}
        </span>
      )}
    </div>
  );
}
