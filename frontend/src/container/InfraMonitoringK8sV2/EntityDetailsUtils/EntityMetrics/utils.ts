import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

export interface MetricsColumn {
	key: string;
	label: string;
	isValueColumn: boolean;
	id?: string;
}

export interface MetricsTableData {
	rows: Record<string, string>[];
	columns: MetricsColumn[];
}

export const getMetricsTableData = (
	data: SuccessResponse<MetricRangePayloadProps> | undefined,
): MetricsTableData[] => {
	if (data?.payload?.data?.result?.length) {
		const rowsData = (data?.payload.data.result[0] as any).table?.rows;
		const columnsData = (data?.payload.data.result[0] as any).table?.columns;

		if (!rowsData || !columnsData) {
			return [{ rows: [], columns: [] }];
		}

		// V4 uses builderQueries, V5 already includes legend in column name
		const builderQueries = (data.params as any)?.compositeQuery?.builderQueries;
		const columns = columnsData.map((columnData: any) => {
			if (columnData.isValueColumn) {
				// V5: column name already includes legend from convertV5ResponseToLegacy
				// V4: need to get legend from builderQueries
				const label = builderQueries?.[columnData.name]?.legend || columnData.name;
				return {
					id: columnData.id || columnData.name,
					key: columnData.id || columnData.name,
					label,
					isValueColumn: true,
				};
			}
			return {
				key: columnData.id || columnData.name,
				label: columnData.name,
				isValueColumn: false,
			};
		});

		if (columns.length === 0) {
			return [{ rows: [], columns: [] }];
		}

		const firstColumnId = columns[0].id || columns[0].key;

		const rows = rowsData.map((rowData: any) => ({
			...rowData.data,
			key: rowData[firstColumnId],
		}));
		return [{ rows, columns }];
	}
	return [{ rows: [], columns: [] }];
};
