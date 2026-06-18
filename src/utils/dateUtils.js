export function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function prevMonth() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(yyyyMM) {
  const [year, month] = yyyyMM.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function ordinalSuffix(day) {
  const d = Number(day);
  const mod10 = d % 10;
  const mod100 = d % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${d}th`;
  if (mod10 === 1) return `${d}st`;
  if (mod10 === 2) return `${d}nd`;
  if (mod10 === 3) return `${d}rd`;
  return `${d}th`;
}
