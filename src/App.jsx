import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import LoginScreen from './components/LoginScreen';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import TransactionsPage from './components/transactions/TransactionsPage';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState('budget');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f1117' }}>
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div
      className="flex flex-col min-h-screen md:h-screen md:overflow-hidden"
      style={{ backgroundColor: '#0f1117' }}
    >
      <Header user={user} activePage={activePage} onNavigate={setActivePage} />
      {activePage === 'budget' ? (
        <Dashboard user={user} />
      ) : (
        <TransactionsPage uid={user.uid} />
      )}
    </div>
  );
}
