import { RowData } from 'lib/query/createTableColumnsFromQuery';

export function createDownloadableData(
	inputData: RowData[],
): Record<string, string>[] {
	return inputData.map((row) => ({
		Name: row.operation.toString(),
		P50: row.A.toString(),
		P90: row.B.toString(),
		P99: row.C.toString(),
		'Number Of Calls': row.F.toString(),
		'Error Rate (%)': row.F1 !== 'N/A' ? row.F1.toString() : '0',
	}));
}
