export function formatCLP(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-CL').format(value);
}

export function formatKWh(value: number): string {
  return `${formatNumber(value)} kWh`;
}

export function formatPercent(value: number): string {
  return `${value}%`;
}

export function formatPayback(years: number): string {
  const full = Math.floor(years);
  const months = Math.round((years - full) * 12);
  if (months === 0) return `${full} años`;
  if (full === 0) return `${months} meses`;
  return `${full} años ${months} meses`;
}
