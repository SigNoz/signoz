import type { TableColumnsType } from 'antd';
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

export function createGenericDownloadableData(
	inputData: RowData[],
	columns: TableColumnsType<RowData> = [],
): Record<string, string>[] {
	const usedColumnTitles = new Set<string>();
	const columnTitleByDataIndex = columns.reduce<Record<string, string>>(
		(acc, column) => {
			if (!('dataIndex' in column)) {
				return acc;
			}

			const dataIndex = Array.isArray(column.dataIndex)
				? column.dataIndex.join('.')
				: column.dataIndex;

			if (!dataIndex) {
				return acc;
			}

			const columnTitle =
				typeof column.title === 'string' || typeof column.title === 'number'
					? String(column.title)
					: String(dataIndex);
			const uniqueColumnTitle = usedColumnTitles.has(columnTitle)
				? `${columnTitle} (${String(dataIndex)})`
				: columnTitle;

			acc[String(dataIndex)] = uniqueColumnTitle;
			usedColumnTitles.add(uniqueColumnTitle);

			return acc;
		},
		{},
	);

	return inputData.map((row) =>
		Object.entries(row).reduce<Record<string, string>>((acc, [key, value]) => {
			if (key === 'key') {
				return acc;
			}

			acc[columnTitleByDataIndex[key] || key] = String(value ?? '');
			return acc;
		}, {}),
	);
}
