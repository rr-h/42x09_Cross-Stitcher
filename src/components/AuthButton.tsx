import { Suspense, lazy, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../sync/remoteSnapshots';

// Lazy load LoginModal to reduce initial bundle size
const LoginModal = lazy(() =>
  import('./LoginModal').then(module => ({ default: module.LoginModal }))
);

export function AuthButton() {
  const { user, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out failed:', err);
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) {
    return <span style={styles.loading}>...</span>;
  }

  if (user) {
    return (
      <div style={styles.container}>
        <span style={styles.email} title={user.email}>
          {user.email}
        </span>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          style={styles.signOutButton}
        >
          {signingOut ? '...' : 'Sign Out'}
        </button>
      </div>
    );
  }

  return (
    <>
      <button onClick={() => setShowLogin(true)} style={styles.signInButton}>
        Sign In
      </button>
      <Suspense fallback={null}>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </Suspense>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  loading: {
    color: '#999',
    fontSize: '0.85rem',
  },
  email: {
    fontSize: '0.8rem',
    color: '#666',
    maxWidth: '150px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  signInButton: {
    padding: '0.4rem 0.75rem',
    backgroundColor: '#f0f0f0',
    color: '#333',
    border: '1px solid #ddd',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
  },
  signOutButton: {
    padding: '0.4rem 0.75rem',
    backgroundColor: 'transparent',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
};
