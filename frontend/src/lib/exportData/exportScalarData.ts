import { createTableColumnsFromQuery } from 'lib/query/createTableColumnsFromQuery';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

import { exportTableData } from './exportTableData';
import { SerializedTable } from './types';

interface ExportScalarDataArgs {
	// The queryRange response object the table mount already holds (the
	// formatForWeb payload carrying webTables).
	data?: SuccessResponse<MetricRangePayloadProps>;
	query: Query;
}

/**
 * Serializes a scalar/table queryRange response into a table — via
 * createTableColumnsFromQuery, the exact preparer QueryTable renders from, so
 * the export inherits the on-screen merge, naming and column order 1:1.
 */
export function exportScalarData({
	data,
	query,
}: ExportScalarDataArgs): SerializedTable {
	const queryTableData = (data?.payload?.data?.newResult?.data?.result ||
		data?.payload?.data?.result ||
		[]) as QueryDataV3[];

	const { columns, dataSource } = createTableColumnsFromQuery({
		query,
		queryTableData,
	});

	return exportTableData({
		// antd widens title/dataIndex; createTableColumnsFromQuery always sets strings
		columns: columns.map((column) => {
			const rawIndex = 'dataIndex' in column ? column.dataIndex : undefined;
			const key =
				typeof rawIndex === 'string' || typeof rawIndex === 'number'
					? String(rawIndex)
					: '';
			const name = typeof column.title === 'string' ? column.title : key;
			return { name, key: key || name };
		}),
		dataSource: dataSource as unknown as Record<string, unknown>[],
	});
}
