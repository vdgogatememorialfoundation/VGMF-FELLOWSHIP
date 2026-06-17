export function formatNumericId(value: string): string {
  if (/^\d{12}$/.test(value)) {
    return `${value.slice(0, 4)} ${value.slice(4, 8)} ${value.slice(8)}`;
  }
  return value;
}
