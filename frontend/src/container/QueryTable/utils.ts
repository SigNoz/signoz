import { RowData } from 'lib/query/createTableColumnsFromQuery';

export function createDownloadableData(
	inputData: RowData[],
): Record<string, string>[] {
	return inputData.map((row) => ({
		Name: row.operation.toString(),
		'P50 (in ms)': row.A.toString(),
		'P90 (in ms)': row.B.toString(),
		'P99 (in ms)': row.C.toString(),
		numberOfCall: row.F.toString(),
	}));
}
