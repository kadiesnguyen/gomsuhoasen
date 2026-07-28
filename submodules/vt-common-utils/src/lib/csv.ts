export type CsvCellValue = string | number | boolean | Date | null | undefined;

function stringifyCsvCellValue(value: Exclude<CsvCellValue, null | undefined>): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

export function formatCsvCell(value: Exclude<CsvCellValue, null | undefined>): string {
  const text = stringifyCsvCellValue(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function formatOptionalCsvCell(value: CsvCellValue): string {
  return value === null || value === undefined ? '""' : formatCsvCell(value);
}

export function formatCsvRow(values: readonly CsvCellValue[]): string {
  return values.map(formatOptionalCsvCell).join(',');
}
