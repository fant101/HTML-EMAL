'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TOOLS } from '@/lib/tools';

// Group tools by category
const CATEGORIES = {};
for (const tool of TOOLS) {
  if (!CATEGORIES[tool.category]) CATEGORIES[tool.category] = [];
  CATEGORIES[tool.category].push(tool);
}

// Max file sizes
const MAX_FILE_MB = 30;
const MAX_TOTAL_MB = 45;
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp'];

function ToolApp() {
  const searchParams = useSearchParams();
  const [activeTool, setActiveTool] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const topRef = useRef(null);

  // Auth state
  const [authed, setAuthed] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // Check auth on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('site-password');
    // Try to verify stored password or check if auth is disabled
    fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: stored || '' }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setAuthed(true);
          if (data.authDisabled) sessionStorage.removeItem('site-password');
        }
      })
      .catch(() => {})
      .finally(() => setAuthChecking(false));
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem('site-password', passwordInput);
        setAuthed(true);
      } else {
        setAuthError(data.error || 'Incorrect password');
      }
    } catch {
      setAuthError('Connection error. Try again.');
    }
  };

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
    setAttachments([]);
    setError('');
    setSuccess('');
    window.history.pushState({}, '', id ? `?tool=${id}` : '/');
  };

  const goHome = () => {
    setActiveTool(null);
    setFormData({});
    setAttachments([]);
    setError('');
    setSuccess('');
    window.history.pushState({}, '', '/');
  };

  // ── File handling ──
  const processFiles = useCallback((files) => {
    const newAttachments = [];
    let errors = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`"${file.name}" — unsupported type. Use PDF, PNG, JPG, GIF, or WebP.`);
        continue;
      }
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > MAX_FILE_MB) {
        errors.push(`"${file.name}" is ${sizeMB.toFixed(1)}MB — max is ${MAX_FILE_MB}MB per file.`);
        continue;
      }
      newAttachments.push(file);
    }

    if (errors.length > 0) {
      setError(errors.join(' '));
    }

    // Check total size
    setAttachments(prev => {
      const combined = [...prev, ...newAttachments];
      const totalMB = combined.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);
      if (totalMB > MAX_TOTAL_MB) {
        setError(`Total attachments would be ${totalMB.toFixed(1)}MB — max is ${MAX_TOTAL_MB}MB combined.`);
        return prev;
      }
      return combined;
    });
  }, []);

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e) => {
    if (e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  }, [processFiles]);

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // ── Form validation ──
  const validateField = (field, value) => {
    if (!value || !value.trim()) return null;
    if (field.type === 'email') {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(value.trim())) return 'Enter a valid email address';
    }
    if (field.type === 'phone' || field.key === 'phone') {
      const digits = value.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) return 'Enter a valid phone number';
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!tool) return;

    // Validate fields
    for (const field of tool.fields) {
      const value = formData[field.key];
      const err = validateField(field, value);
      if (err) {
        setError(`${field.label}: ${err}`);
        return;
      }
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const filled = Object.entries(formData).filter(([, v]) => v && v.trim());
    if (filled.length === 0 && attachments.length === 0) {
      setError('Fill in at least one field or attach a file.');
      setLoading(false);
      return;
    }

    try {
      // Convert attachments to base64
      const encodedAttachments = await Promise.all(
        attachments.map(async (file) => ({
          name: file.name,
          contentType: file.type,
          content: await fileToBase64(file),
        }))
      );

      const headers = { 'Content-Type': 'application/json' };
      const storedPw = sessionStorage.getItem('site-password');
      if (storedPw) headers['x-site-password'] = storedPw;

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          toolId: activeTool,
          formData,
          attachments: encodedAttachments.length > 0 ? encodedAttachments : undefined,
        }),
      });

      if (res.status === 401) {
        setAuthed(false);
        sessionStorage.removeItem('site-password');
        throw new Error('Session expired. Please log in again.');
      }

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

  // Determine input type from field definition
  const getInputType = (field) => {
    if (field.type === 'email' || field.key === 'email') return 'email';
    if (field.type === 'phone' || field.key === 'phone') return 'tel';
    return 'text';
  };

  // ── Auth screen ──
  if (authChecking) {
    return (
      <div>
        <header style={styles.header}>
          <h1 style={styles.logoText}>RESOLUTE</h1>
        </header>
      </div>
    );
  }

  if (!authed) {
    return (
      <div>
        <header style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <h1 style={styles.logoText}>RESOLUTE</h1>
            <span style={styles.subtitle}>Team Tools</span>
          </div>
        </header>
        <main style={styles.main}>
          <div style={{ maxWidth: 360, margin: '60px auto', textAlign: 'center' }}>
            <h2 style={{ ...styles.toolTitle, marginBottom: 8 }}>Sign In</h2>
            <p style={{ ...styles.intro, marginBottom: 24 }}>Enter the team password to continue.</p>
            <form onSubmit={handleLogin}>
              <label htmlFor="auth-password" style={{ ...styles.fieldLabel, textAlign: 'left' }}>Password</label>
              <input
                id="auth-password"
                type="password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="Enter password"
                autoFocus
              />
              {authError && <div style={{ ...styles.errorBox, marginTop: 12 }}>{authError}</div>}
              <button type="submit" style={{ ...styles.submitBtn, background: '#cba135', cursor: 'pointer', marginTop: 16 }}>
                Sign In
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

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
                      aria-label={`${t.label} — ${t.description}`}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#cba135'; e.currentTarget.style.background = '#1a2c1a'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a3f2a'; e.currentTarget.style.background = '#131f13'; }}
                    >
                      <div style={{ fontSize: 24, marginBottom: 8 }} aria-hidden="true">{t.icon}</div>
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
            <button onClick={goHome} style={styles.backBtn} aria-label="Back to all tools">← All Tools</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <span style={{ fontSize: 28 }} aria-hidden="true">{tool.icon}</span>
              <h2 style={styles.toolTitle}>{tool.label}</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {tool.fields.map(field => {
                const fieldId = `field-${field.key}`;
                return (
                  <div key={field.key}>
                    <label htmlFor={fieldId} style={styles.fieldLabel}>{field.label}</label>
                    {field.type === 'select' ? (
                      <select
                        id={fieldId}
                        value={formData[field.key] || ''}
                        onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      >
                        <option value="">Select...</option>
                        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        id={fieldId}
                        value={formData[field.key] || ''}
                        onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        rows={4}
                      />
                    ) : (
                      <input
                        id={fieldId}
                        type={getInputType(field)}
                        value={formData[field.key] || ''}
                        onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── File Upload ── */}
            <div style={{ marginTop: 24 }}>
              <label style={styles.fieldLabel}>Attachments (optional)</label>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  ...styles.dropZone,
                  borderColor: dragOver ? '#cba135' : '#2a3f2a',
                  background: dragOver ? '#1a2c1a' : '#131f13',
                }}
                role="button"
                tabIndex={0}
                aria-label="Upload files — click or drag and drop"
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); }}}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>📎</div>
                <div style={{ fontSize: 13, color: '#8a9a8a' }}>
                  Drag & drop files here, or <span style={{ color: '#cba135', textDecoration: 'underline' }}>browse</span>
                </div>
                <div style={{ fontSize: 11, color: '#6a7a6a', marginTop: 4 }}>
                  PDF, PNG, JPG, GIF, WebP — {MAX_FILE_MB}MB per file, {MAX_TOTAL_MB}MB total
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ALLOWED_TYPES.join(',')}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                aria-hidden="true"
              />

              {/* Attachment list */}
              {attachments.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {attachments.map((file, i) => (
                    <div key={`${file.name}-${i}`} style={styles.attachmentRow}>
                      <span style={{ fontSize: 13, color: '#d4ddd4', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name} <span style={{ color: '#8a9a8a' }}>({(file.size / (1024 * 1024)).toFixed(1)}MB)</span>
                      </span>
                      <button
                        onClick={() => removeAttachment(i)}
                        style={styles.removeBtn}
                        aria-label={`Remove ${file.name}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <div role="alert" style={styles.errorBox}>{error}</div>}
            {success && <div role="status" style={styles.successBox}>{success}</div>}

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
  dropZone: {
    border: '2px dashed #2a3f2a',
    borderRadius: 8,
    padding: '24px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  attachmentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    background: '#1a2c1a',
    borderRadius: 6,
    border: '1px solid #2a3f2a',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: '#c45c5c',
    cursor: 'pointer',
    fontSize: 14,
    padding: '2px 6px',
    fontFamily: 'inherit',
  },
};
