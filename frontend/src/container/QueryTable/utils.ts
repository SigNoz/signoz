import { RowData } from 'lib/query/createTableColumnsFromQuery';

/**
 * Strips Ant table key and converts all values to String for CSV/Excel export.
 */
export function createDownloadableData(
	inputData: RowData[],
	columnLabels?: Record<string, string>,
): Record<string, string>[] {
	if (!inputData || inputData.length === 0) {
		return [];
	}

	// Get all keys from the first row since it's a table
	const allKeys = new Set<string>();
	Object.keys(inputData[0]).forEach((key) => {
		// Exclude internal keys used by Ant table
		if (key !== 'key') {
			allKeys.add(key);
		}
	});

	return inputData.map((row) => {
		const downloadableRow: Record<string, string> = {};

		allKeys.forEach((key) => {
			const value = row[key];

			// Use custom label if provided, otherwise use the raw key
			const formattedKey = columnLabels?.[key] ?? key;

			// Handle null and undefined
			if (value === null || value === undefined) {
				downloadableRow[formattedKey] = '';

				// Handle objects/arrays by stringifying
			} else if (typeof value === 'object') {
				downloadableRow[formattedKey] = JSON.stringify(value);

				// Else make sure it's a string
			} else {
				downloadableRow[formattedKey] = String(value);
			}
		});

		return downloadableRow;
	});
}

export function getFormattedTimestamp(): string {
	const now = new Date();
	const pad = (n: number): string => n.toString().padStart(2, '0');
	return `${now.getFullYear()}_${pad(now.getMonth() + 1)}_${pad(
		now.getDate(),
	)}_${pad(now.getHours())}_${pad(now.getMinutes())}_${pad(now.getSeconds())}`;
}
