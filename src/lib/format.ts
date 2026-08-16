export function formatNumber(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

export function persen(nilai: number): string {
  return `${Math.round(nilai)}%`;
}
