import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

export default function Header({ user, activePage, onNavigate }) {
  async function handleSignOut() {
    try { await signOut(auth); } catch (err) { console.error('Sign-out failed:', err); }
  }

  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b"
      style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
    >
      <span className="font-bold text-lg tracking-tight" style={{ color: '#f1f5f9' }}>
        Budget
      </span>

      <nav className="flex">
        {[
          { id: 'budget', label: 'Budget' },
          { id: 'transactions', label: 'Transactions' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className="relative px-4 py-2 text-sm font-medium transition-colors"
            style={{ color: activePage === item.id ? '#f1f5f9' : '#64748b' }}
          >
            {item.label}
            {activePage === item.id && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: '#6366f1' }}
              />
            )}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        {user.photoURL && (
          <img src={user.photoURL} alt={user.displayName ?? 'User'} className="w-8 h-8 rounded-full" />
        )}
        <span className="text-sm hidden sm:block" style={{ color: '#f1f5f9' }}>{user.displayName}</span>
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
