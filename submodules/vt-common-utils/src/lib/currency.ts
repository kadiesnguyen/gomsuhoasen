const viVnFormatter = new Intl.NumberFormat('vi-VN');

export function formatVnd(value: number): string {
  return `${viVnFormatter.format(value)}₫`;
}
