'use client';

export default function SearchTrendsChart({ data, title = 'Search Trends' }) {
  if (!data || data.length === 0) return null;

  const width = 320;
  const height = 160;
  const padding = { top: 24, right: 16, bottom: 32, left: 48 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVolume = Math.max(...data.map((d) => d.volume), 1);
  const minVolume = Math.min(...data.map((d) => d.volume));
  const range = Math.max(maxVolume - minVolume, 1);

  const getX = (i) => padding.left + (i / (data.length - 1)) * chartWidth;
  const getY = (v) => padding.top + chartHeight - ((v - minVolume) / range) * chartHeight;

  const points = data.map((d, i) => `${getX(i)},${getY(d.volume)}`).join(' ');
  const areaPoints = `${getX(0)},${padding.top + chartHeight} ${points} ${getX(data.length - 1)},${padding.top + chartHeight}`;

  const formatNumber = (n) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      padding: '16px 16px 12px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          {title}
        </div>
      </div>

      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-blue-600)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--color-blue-600)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = padding.top + chartHeight * (1 - pct);
          return (
            <line
              key={i}
              x1={padding.left}
              y1={y}
              x2={padding.left + chartWidth}
              y2={y}
              stroke="var(--color-border-tertiary)"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
          );
        })}

        {/* Area under the line */}
        <polygon points={areaPoints} fill="url(#trendAreaGradient)" />

        {/* Trend line */}
        <polyline
          points={points}
          fill="none"
          stroke="var(--color-blue-600)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={getX(i)}
            cy={getY(d.volume)}
            r="3"
            fill="var(--color-background-primary)"
            stroke="var(--color-blue-600)"
            strokeWidth="2"
          />
        ))}

        {/* Y-axis labels */}
        {[0, 0.5, 1].map((pct, i) => {
          const value = Math.round(minVolume + range * pct);
          const y = padding.top + chartHeight * (1 - pct);
          return (
            <text
              key={i}
              x={padding.left - 8}
              y={y + 3}
              textAnchor="end"
              fontSize="9"
              fill="var(--color-text-tertiary)"
            >
              {formatNumber(value)}
            </text>
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={getX(i)}
            y={height - 8}
            textAnchor="middle"
            fontSize="9"
            fill="var(--color-text-tertiary)"
          >
            {d.month}
          </text>
        ))}
      </svg>
    </div>
  );
}
