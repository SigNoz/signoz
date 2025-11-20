import { RowData } from 'lib/query/createTableColumnsFromQuery';

/**
 * Strips Ant table key and converts all values to String for CSV/Excel export.
 */
export function createDownloadableData(
	inputData: RowData[],
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

	console.log(inputData);
	return inputData.map((row) => {
		const downloadableRow: Record<string, string> = {};

		allKeys.forEach((key) => {
			const value = row[key];

			// TODO : Possible change to format and normalize headers
			const formattedKey = key;

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
