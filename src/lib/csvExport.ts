import type { Row } from './types';

/**
 * Bounty Task 3: Snapshot Export Utility
 *
 * Converts the currently filtered+sorted dataset into a downloadable CSV file.
 * - Entirely client-side (Blob + URL.createObjectURL)
 * - RFC 4180 compliant escaping
 * - Non-blocking: caller wraps in setTimeout(0) so the live stream is never starved
 */

/** Column definitions for the CSV export — superset of what the grid shows */
interface CsvColumnDef {
  header: string;
  field: keyof Row | string;
  format?: (value: unknown) => string;
}

const CSV_COLUMNS: CsvColumnDef[] = [
  { header: 'Project Name',       field: 'project_name' },
  { header: 'Project ID',         field: 'project_id' },
  { header: 'Company ID',         field: 'company_id' },
  { header: 'Status',             field: 'project_status' },
  { header: 'Automation Type',    field: 'automation_type' },
  { header: 'Department',         field: 'department' },
  { header: 'Industry',           field: 'industry' },
  { header: 'Country',            field: 'country' },
  { header: 'Budget (USD)',        field: 'budget_usd',           format: (v) => (typeof v === 'number' ? v.toFixed(2) : String(v ?? '')) },
  { header: 'Annual Savings (USD)', field: 'annual_savings_usd', format: (v) => (typeof v === 'number' ? v.toFixed(2) : String(v ?? '')) },
  { header: 'ROI (%)',             field: 'roi_percent',          format: (v) => (typeof v === 'number' ? v.toFixed(2) : String(v ?? '')) },
  { header: 'Robots Deployed',    field: 'robots_deployed',      format: (v) => (typeof v === 'number' ? String(Math.max(0, v)) : String(v ?? '')) },
  { header: 'Employee Hours Saved', field: 'employee_hours_saved', format: (v) => (typeof v === 'number' ? String(Math.max(0, Math.round(v))) : String(v ?? '')) },
  { header: 'AI Enabled',         field: 'ai_enabled' },
  { header: 'Cloud Deployment',   field: 'cloud_deployment' },
  { header: 'Implementation Partner', field: 'implementation_partner' },
  { header: 'Start Date',         field: 'start_date' },
  { header: 'Completion Date',    field: 'completion_date' },
];

/**
 * RFC 4180 field escaping.
 * Wraps the value in double-quotes if it contains a comma, double-quote, or newline.
 * Escapes embedded double-quotes as "".
 */
function escapeField(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  // Must quote if contains comma, double-quote, CR, or LF
  if (str.includes(',') || str.includes('"') || str.includes('\r') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Builds a CSV string from an ordered array of Row objects.
 * The rows must already be in the desired export order (sorted + filtered).
 */
function buildCsvString(rows: Row[]): string {
  const lines: string[] = [];

  // Header row
  lines.push(CSV_COLUMNS.map((col) => escapeField(col.header)).join(','));

  // Data rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const fields = CSV_COLUMNS.map((col) => {
      const raw = (row as Record<string, unknown>)[col.field as string];
      const formatted = col.format ? col.format(raw) : raw;
      return escapeField(formatted);
    });
    lines.push(fields.join(','));
  }

  // CRLF line endings per RFC 4180
  return lines.join('\r\n');
}

/**
 * Generates a timestamped filename for the snapshot.
 * Format: helix-snapshot-YYYY-MM-DD_HH-mm-ss.csv
 */
function buildFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  return `helix-snapshot-${date}_${time}.csv`;
}

/**
 * Triggers a client-side download of the given CSV string as a .csv file.
 * Uses a temporary object URL that is immediately revoked after the download is initiated.
 */
function triggerDownload(csvContent: string, filename: string): void {
  // BOM (U+FEFF) ensures Excel opens the UTF-8 file correctly without garbling
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  // Clean up immediately — browser has queued the download
  document.body.removeChild(anchor);
  // Revoke after a short delay to ensure the browser has processed the click
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

/**
 * Main export function — called by SnapshotExportButton.
 *
 * @param sortedRows  The rows in their current display order (already filtered + sorted by StateEngine)
 * @returns           The number of rows exported
 */
export function exportSnapshotCsv(sortedRows: Row[]): number {
  if (sortedRows.length === 0) return 0;

  const csvContent = buildCsvString(sortedRows);
  const filename = buildFilename();
  triggerDownload(csvContent, filename);

  return sortedRows.length;
}
