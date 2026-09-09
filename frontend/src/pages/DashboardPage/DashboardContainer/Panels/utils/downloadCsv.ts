import { unparse } from 'papaparse';

import { toSafeFileName } from './toSafeFileName';

/** Serializes rows (keyed by column header) to CSV and downloads the file. */
export function downloadCsv(
	rows: Record<string, string>[],
	fileBaseName: string,
): void {
	const csv = unparse(rows);
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `${toSafeFileName(fileBaseName)}.csv`;
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}
