import { useState } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import { useGoals } from '../../hooks/useGoals';
import { useObligations } from '../../hooks/useObligations';
import { useCategoryRules } from '../../hooks/useCategoryRules';
import { currentMonth, monthLabel } from '../../utils/dateUtils';
import TransactionSummary from './TransactionSummary';
import TransactionGrouped from './TransactionGrouped';
import TransactionChronological from './TransactionChronological';
import ImportModal from './ImportModal';

function getMonthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    opts.push({ value, label: d.toLocaleString('default', { month: 'long', year: 'numeric' }) });
  }
  return opts;
}

const MONTH_OPTIONS = getMonthOptions();

export default function TransactionsPage({ uid }) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [view, setView] = useState('grouped');
  const [showImport, setShowImport] = useState(false);

  const { transactions, loading, importTransactions, updateTransaction, deleteTransaction } = useTransactions(uid, selectedMonth);
  const { goals } = useGoals(uid);
  const { obligations } = useObligations(uid);
  const { rules: categoryRules } = useCategoryRules(uid);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Topbar */}
      <div
        className="flex items-center gap-3 px-6 py-4 border-b flex-wrap"
        style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
      >
        <span className="text-base font-bold mr-2" style={{ color: '#f1f5f9' }}>Transactions</span>

        <select
          className="text-sm px-3 py-1.5 rounded-lg border"
          style={{ backgroundColor: '#0f1117', borderColor: '#2a2d3e', color: '#f1f5f9' }}
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
        >
          {MONTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#2a2d3e' }}>
          {[{ id: 'grouped', label: 'By category' }, { id: 'chronological', label: 'By date' }].map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className="text-sm px-3 py-1.5 transition-colors"
              style={{
                backgroundColor: view === v.id ? '#6366f1' : 'transparent',
                color: view === v.id ? '#fff' : '#64748b',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowImport(true)}
          className="ml-auto px-4 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#14b8a6', color: '#fff' }}
        >
          Import CSV
        </button>
      </div>

      <TransactionSummary transactions={transactions} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
          </div>
        ) : view === 'grouped' ? (
          <TransactionGrouped
            transactions={transactions}
            goals={goals}
            obligations={obligations}
            onUpdate={updateTransaction}
            onDelete={deleteTransaction}
          />
        ) : (
          <TransactionChronological
            transactions={transactions}
            goals={goals}
            obligations={obligations}
            onUpdate={updateTransaction}
            onDelete={deleteTransaction}
          />
        )}
      </div>

      {showImport && (
        <ImportModal
          uid={uid}
          goals={goals}
          obligations={obligations}
          categoryRules={categoryRules}
          onImport={importTransactions}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
