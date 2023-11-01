import { RowData } from 'lib/query/createTableColumnsFromQuery';

export function createDownloadableData(
	inputData: RowData[],
): Record<string, string>[] {
	return inputData.map((row) => ({
		Name: row.operation.toString(),
		'P50 (in ns)': row.A.toString(),
		'P90 (in ns)': row.B.toString(),
		'P99 (in ns)': row.C.toString(),
		'Number Of Calls': row.F.toString(),
		'Error Rate (%)': row.F1 && row.F1 !== 'N/A' ? row.F1.toString() : '0',
	}));
}
