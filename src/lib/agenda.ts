/** Dia da semana de uma data "AAAA-MM-DD": 1 = segunda … 7 = domingo. */
export function weekdayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7
}
