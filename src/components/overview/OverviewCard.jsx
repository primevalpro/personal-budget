import { formatCurrency } from '../../utils/dateUtils';

export default function OverviewCard({ type, obligations = [], goals = [], buckets = [], cm }) {
  let title, primaryAmount, primaryLabel, pct, barColor, metrics;

  if (type === 'obligations') {
    const total = obligations.reduce((s, o) => s + (o.amount || 0), 0);
    const assigned = obligations
      .filter(o => o.assignedMonth === cm)
      .reduce((s, o) => s + (o.assignedAmount || 0), 0);
    const fullCount = obligations.filter(
      o => o.assignedMonth === cm && (o.assignedAmount || 0) >= o.amount && o.amount > 0,
    ).length;
    const partialCount = obligations.filter(
      o => o.assignedMonth === cm && (o.assignedAmount || 0) > 0 && (o.assignedAmount || 0) < o.amount,
    ).length;
    const unassignedCount = obligations.length - fullCount - partialCount;

    title = 'Obligations';
    primaryAmount = formatCurrency(total);
    primaryLabel = 'committed this month';
    pct = total > 0 ? Math.min(1, assigned / total) : 0;
    barColor = pct >= 1 ? '#22c55e' : '#6366f1';
    metrics = [
      { label: 'Assigned', value: formatCurrency(assigned) },
      { label: 'Full', value: String(fullCount), color: fullCount > 0 ? '#22c55e' : '#475569' },
      { label: 'Partial', value: String(partialCount), color: partialCount > 0 ? '#f59e0b' : '#475569' },
      { label: 'Unassigned', value: String(unassignedCount), color: unassignedCount > 0 ? '#64748b' : '#475569' },
    ];
  } else if (type === 'goals') {
    const totalTarget = goals.reduce((s, g) => s + (g.targetAmount || 0), 0);
    const assigned = goals.reduce((s, g) => s + (g.assignedAmount || 0), 0);
    const spent = goals.reduce((s, g) => s + (g.spentAmount || 0), 0);

    title = 'Goals';
    primaryAmount = formatCurrency(totalTarget);
    primaryLabel = 'monthly budget';
    pct = totalTarget > 0 ? Math.min(1, assigned / totalTarget) : 0;
    barColor = pct >= 1 ? '#22c55e' : '#6366f1';
    metrics = [
      { label: 'Assigned', value: formatCurrency(assigned) },
      { label: 'Spent', value: formatCurrency(spent), color: spent > assigned ? '#ef4444' : '#64748b' },
    ];
  } else {
    // buckets
    const totalSaved = buckets.reduce((s, b) => s + (b.currentAmount || 0), 0);
    const totalTarget = buckets.reduce((s, b) => s + (b.targetAmount || 0), 0);
    const complete = buckets.filter(b => b.currentAmount >= b.targetAmount && b.targetAmount > 0).length;
    const withMonthly = buckets.filter(b => (b.monthlyTarget || 0) > 0);
    const monthlyTarget = withMonthly.reduce((s, b) => s + b.monthlyTarget, 0);
    const monthlyAssigned = withMonthly.reduce((s, b) => s + (b.monthlyAssigned || 0), 0);

    title = 'Buckets';
    primaryAmount = formatCurrency(totalSaved);
    primaryLabel = `saved toward ${buckets.length} goal${buckets.length !== 1 ? 's' : ''}`;
    pct = totalTarget > 0 ? Math.min(1, totalSaved / totalTarget) : 0;
    barColor = pct >= 1 ? '#22c55e' : '#6366f1';
    metrics = [
      { label: 'Total Goal', value: formatCurrency(totalTarget) },
      { label: 'Complete', value: `${complete} / ${buckets.length}`, color: complete === buckets.length && buckets.length > 0 ? '#22c55e' : '#64748b' },
      ...(monthlyTarget > 0 ? [{
        label: 'This Month',
        value: `${formatCurrency(monthlyAssigned)} / ${formatCurrency(monthlyTarget)}`,
        color: monthlyAssigned >= monthlyTarget ? '#22c55e' : '#64748b',
      }] : []),
    ];
  }

  const pctDisplay = Math.round(pct * 100);

  return (
    <div className="rounded-xl border flex flex-col gap-5 p-5" style={{ backgroundColor: '#1a1d27', borderColor: '#2a2d3e' }}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#64748b' }}>
          {title}
        </p>
        <p className="text-2xl font-bold tabular-nums" style={{ color: '#f1f5f9' }}>
          {primaryAmount}
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
          {primaryLabel}
        </p>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs" style={{ color: '#64748b' }}>Funded</span>
          <span className="text-xs font-semibold tabular-nums" style={{ color: barColor }}>
            {pctDisplay}%
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#0f1117' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pctDisplay}%`, backgroundColor: barColor }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {metrics.map((m, i) => (
          <div key={i}>
            <p className="text-xs" style={{ color: '#64748b' }}>{m.label}</p>
            <p className="text-sm font-semibold tabular-nums" style={{ color: m.color || '#f1f5f9' }}>
              {m.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
