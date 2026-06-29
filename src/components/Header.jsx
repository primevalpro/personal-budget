import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function Header({ user, onSettings }) {
  const monthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  async function handleSignOut() {
    try { await signOut(auth); } catch (err) { console.error('Sign-out failed:', err); }
  }

  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b"
      style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
    >
      <span className="font-bold text-lg tracking-tight" style={{ color: '#f1f5f9' }}>
        Budget Dashboard
      </span>

      <span className="text-sm font-medium uppercase tracking-widest hidden md:block" style={{ color: '#64748b' }}>
        {monthLabel}
      </span>

      <div className="flex items-center gap-3">
        {user.photoURL && (
          <img src={user.photoURL} alt={user.displayName ?? 'User avatar'} className="w-8 h-8 rounded-full" />
        )}
        <span className="text-sm hidden sm:block" style={{ color: '#f1f5f9' }}>{user.displayName}</span>
        <button
          onClick={onSettings}
          className="p-1.5 rounded-lg border transition-opacity hover:opacity-70"
          style={{ color: '#64748b', borderColor: '#2a2d3e' }}
          title="Settings"
        >
          <GearIcon />
        </button>
        <button
          onClick={handleSignOut}
          className="text-sm px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80"
          style={{ color: '#64748b', borderColor: '#2a2d3e' }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
