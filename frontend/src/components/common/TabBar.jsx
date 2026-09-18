/**
 * Pill-style tab bar — matches the Yearly/Monthly toggle already used on
 * YearlySalesTrend. Used to split a page's sections so only one renders
 * at a time instead of one long scroll.
 *
 * @param {{ tabs: Array<{key: string, label: string}>, active: string, onChange: (key: string) => void }} props
 */
export default function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex',
      overflowX: 'auto',
      maxWidth: '100%',
      whiteSpace: 'nowrap',
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      gap: '4px',
      padding: '4px',
      background: 'var(--bg-main)',
      borderRadius: '8px',
      border: '1px solid var(--card-border)',
      marginBottom: 'var(--space-4)',
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            flexShrink: 0,
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer',
            background: active === tab.key ? 'var(--accent-primary)' : 'transparent',
            color: active === tab.key ? '#fff' : 'var(--text-secondary)',
            transition: 'all 0.2s ease',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
