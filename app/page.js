'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TOOLS } from '@/lib/tools';

// Group tools by category
const CATEGORIES = {};
for (const tool of TOOLS) {
  if (!CATEGORIES[tool.category]) CATEGORIES[tool.category] = [];
  CATEGORIES[tool.category].push(tool);
}

function ToolApp() {
  const searchParams = useSearchParams();
  const [activeTool, setActiveTool] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const topRef = useRef(null);

  // Read ?tool= param on mount
  useEffect(() => {
    const toolParam = searchParams.get('tool');
    if (toolParam) {
      const found = TOOLS.find(t => t.id === toolParam);
      if (found) setActiveTool(toolParam);
    }
  }, [searchParams]);

  const tool = TOOLS.find(t => t.id === activeTool);

  const selectTool = (id) => {
    setActiveTool(id);
    setFormData({});
    setError('');
    setSuccess('');
    // Update URL without reload
    window.history.pushState({}, '', id ? `?tool=${id}` : '/');
  };

  const goHome = () => {
    setActiveTool(null);
    setFormData({});
    setError('');
    setSuccess('');
    window.history.pushState({}, '', '/');
  };

  const handleSubmit = async () => {
    if (!tool) return;
    setLoading(true);
    setError('');
    setSuccess('');

    const filled = Object.entries(formData).filter(([, v]) => v && v.trim());
    if (filled.length === 0) {
      setError('Fill in at least one field.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId: activeTool, formData }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `Error: ${res.status}`);
      }

      // Download the PDF
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resolute-${activeTool}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess('PDF generated and downloading.');
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={topRef}>
      {/* Header */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, cursor: 'pointer' }} onClick={goHome}>
          <h1 style={styles.logoText}>RESOLUTE</h1>
          <span style={styles.subtitle}>Team Tools</span>
        </div>
      </header>

      <main style={styles.main}>
        {/* ── Tool Grid ── */}
        {!activeTool && (
          <div>
            <p style={styles.intro}>Select a tool to get started. Fill in the fields, get a branded PDF back in seconds.</p>

            {Object.entries(CATEGORIES).map(([category, tools]) => (
              <div key={category} style={{ marginBottom: 32 }}>
                <p style={styles.categoryLabel}>{category}</p>
                <div style={styles.grid}>
                  {tools.map(t => (
                    <button key={t.id} onClick={() => selectTool(t.id)} style={styles.card}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#cba135'; e.currentTarget.style.background = '#1a2c1a'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a3f2a'; e.currentTarget.style.background = '#131f13'; }}
                    >
                      <div style={{ fontSize: 24, marginBottom: 8 }}>{t.icon}</div>
                      <div style={styles.cardTitle}>{t.label}</div>
                      <div style={styles.cardDesc}>{t.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Active Tool Form ── */}
        {activeTool && tool && (
          <div>
            <button onClick={goHome} style={styles.backBtn}>← All Tools</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <span style={{ fontSize: 28 }}>{tool.icon}</span>
              <h2 style={styles.toolTitle}>{tool.label}</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {tool.fields.map(field => (
                <div key={field.key}>
                  <label style={styles.fieldLabel}>{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      value={formData[field.key] || ''}
                      onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                    >
                      <option value="">Select...</option>
                      {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.key] || ''}
                      onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      rows={4}
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData[field.key] || ''}
                      onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>

            {error && <div style={styles.errorBox}>{error}</div>}
            {success && <div style={styles.successBox}>{success}</div>}

            <button onClick={handleSubmit} disabled={loading} style={{
              ...styles.submitBtn,
              background: loading ? '#a8862d' : '#cba135',
              cursor: loading ? 'wait' : 'pointer',
            }}>
              {loading ? 'Generating PDF...' : 'Generate PDF'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function Page() {
  return (
    <Suspense fallback={
      <div style={{ ...styles.header, borderBottom: '1px solid #2a3f2a' }}>
        <h1 style={styles.logoText}>RESOLUTE</h1>
      </div>
    }>
      <ToolApp />
    </Suspense>
  );
}

// ── Styles ──────────────────────────────────
const styles = {
  header: {
    padding: '28px 32px 24px',
    borderBottom: '1px solid #2a3f2a',
    background: '#131f13',
  },
  logoText: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 28,
    fontWeight: 600,
    color: '#cba135',
    margin: 0,
    letterSpacing: '0.02em',
  },
  subtitle: {
    fontSize: 13,
    color: '#8a9a8a',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    fontWeight: 500,
  },
  main: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '32px 24px 64px',
  },
  intro: {
    fontSize: 14,
    color: '#8a9a8a',
    marginBottom: 28,
    lineHeight: 1.6,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#8a9a8a',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 12,
    marginBottom: 8,
  },
  card: {
    background: '#131f13',
    border: '1px solid #2a3f2a',
    borderRadius: 8,
    padding: '20px 18px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
    outline: 'none',
    color: 'inherit',
    fontFamily: 'inherit',
  },
  cardTitle: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 18,
    fontWeight: 600,
    color: '#f0f4f0',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#8a9a8a',
    lineHeight: 1.5,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#a8862d',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    padding: '0 0 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  toolTitle: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 24,
    fontWeight: 600,
    color: '#f0f4f0',
    margin: 0,
  },
  fieldLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: '#8a9a8a',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  submitBtn: {
    marginTop: 24,
    width: '100%',
    padding: '14px 0',
    color: '#0b140b',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '0.04em',
    transition: 'background 0.2s',
  },
  errorBox: {
    marginTop: 16,
    padding: '10px 14px',
    background: 'rgba(196,92,92,0.12)',
    border: '1px solid #c45c5c',
    borderRadius: 6,
    fontSize: 13,
    color: '#c45c5c',
  },
  successBox: {
    marginTop: 16,
    padding: '10px 14px',
    background: 'rgba(203,161,53,0.12)',
    border: '1px solid #cba135',
    borderRadius: 6,
    fontSize: 13,
    color: '#cba135',
  },
};
