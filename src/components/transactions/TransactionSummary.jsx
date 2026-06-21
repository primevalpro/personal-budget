import { formatCurrency } from '../../utils/dateUtils';

export default function TransactionSummary({ transactions }) {
  const nonSkipped = transactions.filter(t => t.categoryType !== 'skipped');
  const totalSpent = nonSkipped.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  let lastImport = null;
  for (const tx of transactions) {
    const ts = tx.importedAt?.toDate?.();
    if (ts && (!lastImport || ts > lastImport)) lastImport = ts;
  }
  const lastImportLabel = lastImport
    ? lastImport.toLocaleString('default', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'None';

  return (
    <div
      className="flex items-center gap-8 px-6 py-4 border-b flex-wrap"
      style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}
    >
      <Metric label="Total Spent" value={formatCurrency(totalSpent)} />
      <Metric label="Transactions" value={String(nonSkipped.length)} />
      <Metric label="Last Import" value={lastImportLabel} />
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#64748b' }}>
        {label}
      </span>
      <span className="text-lg font-bold tabular-nums" style={{ color: '#f1f5f9' }}>
        {value}
      </span>
    </div>
  );
}
