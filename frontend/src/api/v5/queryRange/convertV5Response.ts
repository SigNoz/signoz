import { isEmpty } from 'lodash-es';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadV3 } from 'types/api/metrics/getQueryRange';
import {
	DistributionData,
	MetricRangePayloadV5,
	RawData,
	ScalarData,
	TimeSeriesData,
} from 'types/api/v5/queryRange';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

/**
 * Converts V5 TimeSeriesData to legacy format
 */
function convertTimeSeriesData(
	timeSeriesData: TimeSeriesData,
	legendMap: Record<string, string>,
): QueryDataV3 {
	// Convert V5 time series format to legacy QueryDataV3 format
	return {
		queryName: timeSeriesData.queryName,
		legend: legendMap[timeSeriesData.queryName] || timeSeriesData.queryName,
		series: timeSeriesData.aggregations.flatMap((aggregation) =>
			aggregation.series.map((series) => ({
				labels: series.labels
					? Object.fromEntries(
							series.labels.map((label) => [label.key.name, label.value]),
					  )
					: {},
				labelsArray: series.labels
					? series.labels.map((label) => ({ [label.key.name]: label.value }))
					: [],
				values: series.values.map((value) => ({
					timestamp: value.timestamp,
					value: String(value.value),
				})),
			})),
		),
		list: null,
	};
}

/**
 * Helper function to collect columns from scalar data
 */
function collectColumnsFromScalarData(
	scalarData: ScalarData[],
): { name: string; queryName: string; isValueColumn: boolean }[] {
	const columnMap = new Map<
		string,
		{ name: string; queryName: string; isValueColumn: boolean }
	>();

	scalarData.forEach((scalar) => {
		scalar.columns.forEach((col) => {
			if (col.columnType === 'group') {
				// For group columns, use the column name as-is
				const key = `${col.name}_group`;
				if (!columnMap.has(key)) {
					columnMap.set(key, {
						name: col.name,
						queryName: '', // Group columns don't have query names
						isValueColumn: false,
					});
				}
			} else if (col.columnType === 'aggregation') {
				// For aggregation columns, use the query name as the column name
				const key = `${col.queryName}_aggregation`;
				if (!columnMap.has(key)) {
					columnMap.set(key, {
						name: col.queryName, // Use query name as column name (A, B, etc.)
						queryName: col.queryName,
						isValueColumn: true,
					});
				}
			}
		});
	});

	return Array.from(columnMap.values()).sort((a, b) => {
		if (a.isValueColumn !== b.isValueColumn) {
			return a.isValueColumn ? 1 : -1;
		}
		return a.name.localeCompare(b.name);
	});
}

/**
 * Helper function to process scalar data rows with unified table structure
 */
function processScalarDataRows(
	scalarData: ScalarData[],
): { data: Record<string, any> }[] {
	// First, identify all group columns and all value columns
	const allGroupColumns = new Set<string>();
	const allValueColumns = new Set<string>();

	scalarData.forEach((scalar) => {
		scalar.columns.forEach((col) => {
			if (col.columnType === 'group') {
				allGroupColumns.add(col.name);
			} else if (col.columnType === 'aggregation') {
				// Use query name for value columns to match expected format
				allValueColumns.add(col.queryName);
			}
		});
	});

	// Create a unified row structure
	const unifiedRows = new Map<string, Record<string, any>>();

	// Process each scalar result
	scalarData.forEach((scalar) => {
		scalar.data.forEach((dataRow) => {
			const groupColumns = scalar.columns.filter(
				(col) => col.columnType === 'group',
			);

			// Create row key based on group columns
			let rowKey: string;
			const groupValues: Record<string, any> = {};

			if (groupColumns.length > 0) {
				const keyParts: string[] = [];
				groupColumns.forEach((col, index) => {
					const value = dataRow[index];
					keyParts.push(String(value));
					groupValues[col.name] = value;
				});
				rowKey = keyParts.join('|');
			} else {
				// For scalar values without grouping, create a default row
				rowKey = 'default_row';
				// Set all group columns to 'n/a' for this row
				Array.from(allGroupColumns).forEach((groupCol) => {
					groupValues[groupCol] = 'n/a';
				});
			}

			// Get or create the unified row
			if (!unifiedRows.has(rowKey)) {
				const newRow: Record<string, any> = { ...groupValues };
				// Initialize all value columns to 'n/a'
				Array.from(allValueColumns).forEach((valueCol) => {
					newRow[valueCol] = 'n/a';
				});
				unifiedRows.set(rowKey, newRow);
			}

			const row = unifiedRows.get(rowKey)!;

			// Fill in the aggregation values using query name as column name
			scalar.columns.forEach((col, colIndex) => {
				if (col.columnType === 'aggregation') {
					row[col.queryName] = dataRow[colIndex];
				}
			});
		});
	});

	return Array.from(unifiedRows.values()).map((rowData) => ({
		data: rowData,
	}));
}

/**
 * Converts V5 ScalarData array to legacy format with table structure
 */
function convertScalarDataArrayToTable(
	scalarDataArray: ScalarData[],
	legendMap: Record<string, string>,
): QueryDataV3 {
	// If no scalar data, return empty structure
	if (!scalarDataArray || scalarDataArray.length === 0) {
		return {
			queryName: '',
			legend: '',
			series: null,
			list: null,
			table: {
				columns: [],
				rows: [],
			},
		};
	}

	// Collect columns and process rows
	const columns = collectColumnsFromScalarData(scalarDataArray);
	const rows = processScalarDataRows(scalarDataArray);

	// Get the primary query name
	const primaryQuery = scalarDataArray.find((s) =>
		s.columns.some((c) => c.columnType === 'aggregation'),
	);
	const queryName =
		primaryQuery?.columns.find((c) => c.columnType === 'aggregation')
			?.queryName ||
		scalarDataArray[0]?.columns[0]?.queryName ||
		'';

	return {
		queryName,
		legend: legendMap[queryName] || queryName,
		series: null,
		list: null,
		table: {
			columns,
			rows,
		},
	};
}

/**
 * Converts V5 RawData to legacy format
 */
function convertRawData(
	rawData: RawData,
	legendMap: Record<string, string>,
): QueryDataV3 {
	// Convert V5 raw format to legacy QueryDataV3 format
	return {
		queryName: rawData.queryName,
		legend: legendMap[rawData.queryName] || rawData.queryName,
		series: null,
		list: rawData.rows?.map((row) => ({
			timestamp: row.timestamp,
			data: {
				// Map raw data to ILog structure - spread row.data first to include all properties
				...row.data,
				date: row.timestamp,
			} as any,
		})),
	};
}

/**
 * Converts V5 DistributionData to legacy format
 */
function convertDistributionData(
	distributionData: DistributionData,
	legendMap: Record<string, string>,
): any {
	// eslint-disable-line @typescript-eslint/no-explicit-any
	// Convert V5 distribution format to legacy histogram format
	return {
		...distributionData,
		legendMap,
	};
}

/**
 * Helper function to convert V5 data based on type
 */
function convertV5DataByType(
	v5Data: any,
	legendMap: Record<string, string>,
): MetricRangePayloadV3['data'] {
	switch (v5Data?.type) {
		case 'time_series': {
			const timeSeriesData = v5Data.data.results as TimeSeriesData[];
			return {
				resultType: 'time_series',
				result: timeSeriesData.map((timeSeries) =>
					convertTimeSeriesData(timeSeries, legendMap),
				),
			};
		}
		case 'scalar': {
			const scalarData = v5Data.data.results as ScalarData[];
			// For scalar data, combine all results into a single table
			const combinedTable = convertScalarDataArrayToTable(scalarData, legendMap);
			return {
				resultType: 'scalar',
				result: [combinedTable],
			};
		}
		case 'raw': {
			const rawData = v5Data.data.results as RawData[];
			return {
				resultType: 'raw',
				result: rawData.map((raw) => convertRawData(raw, legendMap)),
			};
		}
		case 'distribution': {
			const distributionData = v5Data.data.results as DistributionData[];
			return {
				resultType: 'distribution',
				result: distributionData.map((distribution) =>
					convertDistributionData(distribution, legendMap),
				),
			};
		}
		default:
			return {
				resultType: '',
				result: [],
			};
	}
}

/**
 * Converts V5 API response to legacy format expected by frontend components
 */
export function convertV5ResponseToLegacy(
	v5Response: SuccessResponse<MetricRangePayloadV5>,
	legendMap: Record<string, string>,
	// formatForWeb?: boolean,
): SuccessResponse<MetricRangePayloadV3> {
	const { payload } = v5Response;
	const v5Data = payload?.data;

	// todo - sagar
	// If formatForWeb is true, return as-is (like existing logic)
	// Exception: scalar data should always be converted to table format
	// if (formatForWeb && v5Data?.type !== 'scalar') {
	// 	return v5Response as any;
	// }

	// Convert based on V5 response type
	const convertedData = convertV5DataByType(v5Data, legendMap);

	// Create legacy-compatible response structure
	const legacyResponse: SuccessResponse<MetricRangePayloadV3> = {
		...v5Response,
		payload: {
			data: convertedData,
		},
	};

	// Apply legend mapping (similar to existing logic)
	if (legacyResponse.payload?.data?.result) {
		legacyResponse.payload.data.result = legacyResponse.payload.data.result.map(
			(queryData: any) => {
				// eslint-disable-line @typescript-eslint/no-explicit-any
				const newQueryData = queryData;
				newQueryData.legend = legendMap[queryData.queryName];

				// If metric names is an empty object
				if (isEmpty(queryData.metric)) {
					// If metrics list is empty && the user haven't defined a legend then add the legend equal to the name of the query.
					if (!newQueryData.legend) {
						newQueryData.legend = queryData.queryName;
					}
					// If name of the query and the legend if inserted is same then add the same to the metrics object.
					if (queryData.queryName === newQueryData.legend) {
						newQueryData.metric = newQueryData.metric || {};
						newQueryData.metric[queryData.queryName] = queryData.queryName;
					}
				}

				return newQueryData;
			},
		);
	}

	return legacyResponse;
}
