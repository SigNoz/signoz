import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Column, QueryData, QueryDataV3 } from 'types/api/widgets/getQuery';

// eslint-disable-next-line sonarjs/cognitive-complexity
export function populateMultipleResults(
	responseData: SuccessResponse<MetricRangePayloadProps, unknown>,
): SuccessResponse<MetricRangePayloadProps, unknown> {
	const queryResults = responseData?.payload?.data?.newResult?.data?.result;
	const allFormattedResults: QueryData[] = [];

	queryResults?.forEach((query: QueryDataV3) => {
		const { queryName, legend, table } = query;
		if (!table) return;

		const { columns, rows } = table;

		const valueCol = columns?.find((column: Column) => column.isValueColumn);
		const labelCols = columns?.filter((column: Column) => !column.isValueColumn);

		rows?.forEach((row) => {
			const metric: Record<string, string> = {};
			labelCols?.forEach((col) => {
				metric[col.name] = String(row.data[col.id || col.name]);
			});

			let colValue;

			if (valueCol) {
				colValue = row.data[valueCol.id || valueCol.name];
			} else {
				colValue = '';
			}

			allFormattedResults.push({
				metric,
				values: [[0, String(colValue)]],
				queryName,
				legend: legend || '',
			});
		});
	});

	if (responseData?.payload?.data?.result?.length > 0) {
		const resultData = responseData.payload.data.result;
		resultData.forEach((item) => {
			// Ensure item.values exists and is an array
			const valuesArray = Array.isArray(item.values) ? item.values : [];
			// Filter out null/undefined values and sort by timestamp descending
			const nonNullValues = valuesArray
				.filter((v: any) => v && v[1] !== null && v[1] !== undefined)
				.sort((a: any, b: any) => b[0] - a[0]);
			// Pick the first (latest) value, or fallback to '0'
			const lastNonNullValue =
				nonNullValues.length > 0 ? nonNullValues[0][1] : '0';

			allFormattedResults.push({
				metric: item.metric,
				values: [[0, String(lastNonNullValue)]],
				queryName: item.queryName,
				legend: item.legend || '',
			});
		});
	}

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
