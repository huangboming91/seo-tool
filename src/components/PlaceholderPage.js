export default function PlaceholderPage({ title, description }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      padding: '40px 20px',
    }}>
      <div style={{
        fontSize: 40,
        marginBottom: 16,
        opacity: 0.4,
      }}>
        &#128736;
      </div>
      <h1 style={{
        fontSize: 20,
        fontWeight: 500,
        color: 'var(--color-text-primary)',
        marginBottom: 12,
      }}>
        {title}
      </h1>
      <p style={{
        fontSize: 14,
        color: 'var(--color-text-secondary)',
        maxWidth: 420,
        lineHeight: 1.7,
        marginBottom: 8,
      }}>
        {description}
      </p>
      <p style={{
        fontSize: 12,
        color: 'var(--color-text-tertiary)',
        marginTop: 8,
      }}>
        This module is under development. Currently active: Keyword Research.
      </p>
    </div>
  );
}
