import { useState } from 'react';
import { BarChart3, TrendingUp, Clock, FileText, Activity } from 'lucide-react';

const REPORT_TYPES = {
  spotlist: {
    id: 'spotlist',
    name: 'Spotlist Report',
    description: 'Detailed spotlist with XRP, SPEND, and other metrics',
    icon: FileText,
    default: true
  },
  topTen: {
    id: 'topTen',
    name: 'Top Ten Report',
    description: 'Top 10 advertisers/brands/products by metric',
    icon: BarChart3
  },
  reachFrequency: {
    id: 'reachFrequency',
    name: 'Reach & Frequency',
    description: 'Reach and frequency analysis',
    icon: TrendingUp
  },
  daypartAnalysis: {
    id: 'daypartAnalysis',
    name: 'Daypart Analysis',
    description: 'Performance analysis by time of day',
    icon: Clock
  },
  deepAnalysis: {
    id: 'deepAnalysis',
    name: 'Deep Analysis (KPIs)',
    description: 'Channel/Event analysis with KPIs',
    icon: Activity
  }
};

export default function ReportTypeSelector({ reportType, setReportType }) {
  const [expanded, setExpanded] = useState(false);

  const selectedType = REPORT_TYPES[reportType] || REPORT_TYPES.spotlist;
  const Icon = selectedType.icon;

  return (
    <div>
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-s)',
        marginBottom: 'var(--space-s)',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 500,
        color: 'var(--text-primary)'
      }}>
        <Icon size={16} />
        Report Type
      </label>

      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%',
            padding: 'var(--space-m)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            fontSize: 'var(--font-size-base)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)' }}>
            <Icon size={18} />
            <div>
              <div style={{ fontWeight: 500 }}>{selectedType.name}</div>
              <div style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-tertiary)',
                marginTop: '2px'
              }}>
                {selectedType.description}
              </div>
            </div>
          </div>
          <span style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-tertiary)'
          }}>
            {expanded ? '▲' : '▼'}
          </span>
        </button>

        {expanded && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {Object.values(REPORT_TYPES).map((type) => {
              const TypeIcon = type.icon;
              const isSelected = reportType === type.id;

              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => {
                    setReportType(type.id);
                    setExpanded(false);
                  }}
                  style={{
                    width: '100%',
                    padding: 'var(--space-m)',
                    border: 'none',
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-s)',
                    textAlign: 'left',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <TypeIcon size={18} style={{
                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    flexShrink: 0,
                    marginTop: '2px'
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: isSelected ? 600 : 500,
                      marginBottom: '4px'
                    }}>
                      {type.name}
                    </div>
                    <div style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--text-tertiary)'
                    }}>
                      {type.description}
                    </div>
                  </div>
                  {isSelected && (
                    <span style={{
                      color: 'var(--accent-primary)',
                      fontSize: '18px'
                    }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {expanded && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setExpanded(false)}
        />
      )}
    </div>
  );
}


