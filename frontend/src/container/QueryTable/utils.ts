import { RowData } from 'lib/query/createTableColumnsFromQuery';

export function createDownloadableData(
	inputData: RowData[],
): Record<string, string>[] {
	return inputData.map((row) => ({
		Name: String(row.operation || ''),
		'P50 (in ns)': String(row.A || ''),
		'P90 (in ns)': String(row.B || ''),
		'P99 (in ns)': String(row.C || ''),
		'Number Of Calls': String(row.F || ''),
		'Error Rate (%)': String(row.F1 && row.F1 !== 'N/A' ? row.F1 : '0'),
	}));
}
