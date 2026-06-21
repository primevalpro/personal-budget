import TransactionRow from './TransactionRow';

export default function TransactionChronological({ transactions, goals, obligations, onUpdate, onDelete }) {
  if (transactions.length === 0) {
    return (
      <div className="p-6 text-center text-sm" style={{ color: '#64748b' }}>
        No transactions for this month.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto w-full">
      <div
        className="rounded-lg overflow-hidden"
        style={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3e' }}
      >
        {transactions.map(tx => (
          <TransactionRow
            key={tx.id}
            tx={tx}
            goals={goals}
            obligations={obligations}
            showCategory={true}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
