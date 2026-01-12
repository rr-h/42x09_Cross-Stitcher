import { useState } from 'react';
import { signInWithEmailOtp } from '../sync/remoteSnapshots';

interface LoginModalProps {
  onClose: () => void;
}

export function LoginModal({ onClose }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('sending');
    setErrorMsg('');

    try {
      await signInWithEmailOtp(email.trim());
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send login link');
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <button style={styles.closeButton} onClick={onClose}>
          &times;
        </button>

        <h2 style={styles.title}>Sign In</h2>
        <p style={styles.subtitle}>Sign in to sync your progress across devices</p>

        {status === 'sent' ? (
          <div style={styles.successBox}>
            <p style={styles.successText}>Check your email!</p>
            <p style={styles.successSubtext}>
              We sent a magic link to <strong>{email}</strong>. Click the link to sign in.
            </p>
            <button style={styles.button} onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={styles.label}>
              Email address
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={styles.input}
                autoFocus
                disabled={status === 'sending'}
              />
            </label>

            {status === 'error' && <p style={styles.error}>{errorMsg}</p>}

            <button
              type="submit"
              style={{
                ...styles.button,
                opacity: status === 'sending' ? 0.7 : 1,
              }}
              disabled={status === 'sending' || !email.trim()}
            >
              {status === 'sending' ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    padding: '2rem',
    width: '100%',
    maxWidth: '400px',
    position: 'relative',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  },
  closeButton: {
    position: 'absolute',
    top: '0.75rem',
    right: '0.75rem',
    background: 'none',
    border: 'none',
    fontSize: '0.8rem',
    cursor: 'pointer',
    color: '#666',
    lineHeight: 1,
    padding: '0.25rem',
  },
  title: {
    margin: '0 0 0.5rem 0',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#333',
  },
  subtitle: {
    margin: '0 0 1.5rem 0',
    color: '#666',
    fontSize: '0.8rem',
  },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: '500',
    color: '#333',
    marginBottom: '1rem',
  },
  input: {
    display: 'block',
    width: '100%',
    padding: '0.75rem',
    marginTop: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '0.375rem',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#2D5A27',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  error: {
    color: '#dc2626',
    fontSize: '0.775rem',
    margin: '0.5rem 0',
  },
  successBox: {
    textAlign: 'center',
  },
  successText: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#2D5A27',
    margin: '0 0 0.5rem 0',
  },
  successSubtext: {
    color: '#666',
    fontSize: '0.775rem',
    margin: '0 0 1.5rem 0',
  },
};
