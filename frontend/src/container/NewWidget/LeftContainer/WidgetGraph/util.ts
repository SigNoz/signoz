import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { QueryData, QueryDataV3 } from 'types/api/widgets/getQuery';

export function populateMultipleResults(
	responseData: SuccessResponse<MetricRangePayloadProps, unknown>,
): SuccessResponse<MetricRangePayloadProps, unknown> {
	const queryResults = responseData?.payload?.data?.newResult?.data?.result;
	const allFormattedResults: QueryData[] = [];

	queryResults?.forEach((query: QueryDataV3) => {
		const { queryName, legend, table } = query;
		if (!table) return;

		const { columns, rows } = table;

		const valueCol = columns?.find((c) => c.isValueColumn);
		const labelCols = columns?.filter((c) => !c.isValueColumn);

		rows?.forEach((row) => {
			const metric: Record<string, string> = {};
			labelCols?.forEach((col) => {
				metric[col.name] = String(row.data[col.name]);
			});

			allFormattedResults.push({
				metric,
				values: [[0, String(row.data[valueCol!.name])]],
				queryName,
				legend: legend || '',
			});
		});
	});

	// Create a copy instead of mutating the original
	const updatedResponseData: SuccessResponse<
		MetricRangePayloadProps,
		unknown
	> = {
		...responseData,
		payload: {
			...responseData.payload,
			data: {
				...responseData.payload.data,
				result: allFormattedResults,
			},
		},
	};

	return updatedResponseData;
}
