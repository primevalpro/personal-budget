import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export default function LoginScreen() {
  async function handleSignIn() {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Sign-in failed:', err);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0f1117' }}
    >
      <div
        className="rounded-xl border p-10 flex flex-col items-center gap-6 w-full max-w-sm"
        style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-3xl font-bold tracking-tight" style={{ color: '#f1f5f9' }}>
            Budget Dashboard
          </span>
          <span className="text-sm" style={{ color: '#64748b' }}>
            Personal finance, all in one place
          </span>
        </div>

        <button
          onClick={handleSignIn}
          className="flex items-center gap-3 w-full justify-center px-5 py-3 rounded-lg font-medium transition-opacity hover:opacity-90 active:opacity-75"
          style={{ backgroundColor: '#6366f1', color: '#f1f5f9' }}
        >
          <GoogleIcon />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#fff" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
    </svg>
  );
}
