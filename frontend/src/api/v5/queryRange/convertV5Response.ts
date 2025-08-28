import { cloneDeep, isEmpty } from 'lodash-es';
import { SuccessResponse, Warning } from 'types/api';
import { MetricRangePayloadV3 } from 'types/api/metrics/getQueryRange';
import {
	DistributionData,
	MetricRangePayloadV5,
	QueryRangeRequestV5,
	RawData,
	ScalarData,
	TimeSeriesData,
} from 'types/api/v5/queryRange';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

// Severity normalization mapping
const SEVERITY_VARIANTS = {
	TRACE: ['TRACE', 'Trace', 'trace', 'trc', 'Trc'],
	DEBUG: ['DEBUG', 'Debug', 'debug', 'dbg', 'Dbg'],
	INFO: ['INFO', 'Info', 'info', 'Information', 'information'],
	WARN: ['WARN', 'Warn', 'warn', 'warning', 'Warning', 'wrn', 'Wrn'],
	ERROR: [
		'ERROR',
		'Error',
		'error',
		'err',
		'Err',
		'ERR',
		'fail',
		'Fail',
		'FAIL',
	],
	FATAL: [
		'FATAL',
		'Fatal',
		'fatal',
		'critical',
		'Critical',
		'CRITICAL',
		'crit',
		'Crit',
		'CRIT',
		'panic',
		'Panic',
		'PANIC',
	],
};

/**
 * Normalizes severity labels to standard values
 * @param severity - Original severity value
 * @returns Normalized severity value or original if no mapping found
 */
function normalizeSeverityLabel(severity: string): string {
	const normalized = Object.keys(SEVERITY_VARIANTS).find((key) =>
		SEVERITY_VARIANTS[key as keyof typeof SEVERITY_VARIANTS].includes(severity),
	);
	return normalized || severity;
}

/**
 * Normalizes severity_text labels in a labels object
 * @param labels - Object containing label key-value pairs
 * @returns Labels object with normalized severity_text value
 */
function normalizeLabelsObject(
	labels: Record<string, string>,
): Record<string, string> {
	if (labels.severity_text) {
		return {
			...labels,
			severity_text: normalizeSeverityLabel(labels.severity_text),
		};
	}
	return labels;
}

function getColName(
	col: ScalarData['columns'][number],
	legendMap: Record<string, string>,
	aggregationPerQuery: Record<string, any>,
): string {
	if (col.columnType === 'group') {
		return col.name;
	}

	const aggregation =
		aggregationPerQuery?.[col.queryName]?.[col.aggregationIndex];
	const legend = legendMap[col.queryName];
	const alias = aggregation?.alias;
	const expression = aggregation?.expression || '';
	const aggregationsCount = aggregationPerQuery[col.queryName]?.length || 0;
	const isSingleAggregation = aggregationsCount === 1;

	if (aggregationsCount > 0) {
		// Single aggregation: Priority is alias > legend > expression
		if (isSingleAggregation) {
			return alias || legend || expression || col.queryName;
		}

		// Multiple aggregations: Each follows single rules BUT never shows legend
		// Priority: alias > expression (legend is ignored for multiple aggregations)
		return alias || expression || col.queryName;
	}

	return legend || col.queryName;
}

function getColId(
	col: ScalarData['columns'][number],
	aggregationPerQuery: Record<string, any>,
): string {
	if (col.columnType === 'group') {
		return col.name;
	}
	const aggregation =
		aggregationPerQuery?.[col.queryName]?.[col.aggregationIndex];
	const expression = aggregation?.expression || '';
	const aggregationsCount = aggregationPerQuery[col.queryName]?.length || 0;
	const isMultipleAggregations = aggregationsCount > 1;

	if (isMultipleAggregations && expression) {
		return `${col.queryName}.${expression}`;
	}

	return col.queryName;
}

/**
 * Converts V5 TimeSeriesData to legacy format
 */
function convertTimeSeriesData(
	timeSeriesData: TimeSeriesData,
	legendMap: Record<string, string>,
): QueryDataV3 {
	// Convert V5 time series format to legacy QueryDataV3 format

	// Helper function to process series data
	const processSeriesData = (
		aggregations: any[],
		seriesKey:
			| 'series'
			| 'predictedSeries'
			| 'upperBoundSeries'
			| 'lowerBoundSeries'
			| 'anomalyScores',
		// eslint-disable-next-line sonarjs/cognitive-complexity
	): any[] =>
		aggregations?.flatMap((aggregation) => {
			const { index, alias } = aggregation;
			const seriesData = aggregation[seriesKey];

			if (!seriesData || !seriesData.length) {
				return [];
			}

			const processedSeries = seriesData.map((series: any) => {
				// Create labels object with normalization
				const rawLabels = series.labels
					? Object.fromEntries(
							series.labels.map((label: any) => [label.key.name, label.value]),
					  )
					: {};

				// Normalize the labels, specifically severity_text
				const normalizedLabels = normalizeLabelsObject(rawLabels);

				return {
					labels: normalizedLabels,
					labelsArray: series.labels
						? series.labels.map((label: any) => ({
								[label.key.name]:
									label.key.name === 'severity_text'
										? normalizeSeverityLabel(label.value)
										: label.value,
						  }))
						: [],
					values: series.values.map((value: any) => ({
						timestamp: value.timestamp,
						value: String(value.value),
					})),
					metaData: {
						alias,
						index,
						queryName: timeSeriesData.queryName,
					},
				};
			});

			// Aggregate series with identical normalized labels
			const labelsMap = new Map<string, any>();

			processedSeries.forEach((series: { labels: any; values: any[] }) => {
				const labelsKey = JSON.stringify(series.labels);
				const existingSeries = labelsMap.get(labelsKey);

				if (existingSeries) {
					// Merge values: combine timestamps and sum values for same timestamps
					const mergedValues = new Map<number, number>();

					// Add existing values
					existingSeries.values.forEach((value: any) => {
						mergedValues.set(value.timestamp, parseFloat(value.value) || 0);
					});

					// Add current series values
					series.values.forEach((value: any) => {
						const { timestamp } = value;
						const currentValue = parseFloat(value.value) || 0;
						const existingValue = mergedValues.get(timestamp) || 0;
						mergedValues.set(timestamp, existingValue + currentValue);
					});

					// Update existing series with merged values
					existingSeries.values = Array.from(mergedValues.entries())
						.sort(([a], [b]) => a - b)
						.map(([timestamp, value]) => ({
							timestamp,
							value: String(value),
						}));
				} else {
					// First series with this label combination
					labelsMap.set(labelsKey, { ...series });
				}
			});

			// Convert map back to array
			return Array.from(labelsMap.values());
		});

	return {
		queryName: timeSeriesData.queryName,
		legend: legendMap[timeSeriesData.queryName] || timeSeriesData.queryName,
		series: processSeriesData(timeSeriesData?.aggregations, 'series'),
		predictedSeries: processSeriesData(
			timeSeriesData?.aggregations,
			'predictedSeries',
		),
		upperBoundSeries: processSeriesData(
			timeSeriesData?.aggregations,
			'upperBoundSeries',
		),
		lowerBoundSeries: processSeriesData(
			timeSeriesData?.aggregations,
			'lowerBoundSeries',
		),
		anomalyScores: processSeriesData(
			timeSeriesData?.aggregations,
			'anomalyScores',
		),
		list: null,
	};
}

/**
 * Converts V5 ScalarData array to legacy format with table structure
 */
function convertScalarDataArrayToTable(
	scalarDataArray: ScalarData[],
	legendMap: Record<string, string>,
	aggregationPerQuery: Record<string, any>,
): QueryDataV3[] {
	// If no scalar data, return empty structure

	if (!scalarDataArray || scalarDataArray.length === 0) {
		return [];
	}

	// Process each scalar data separately to maintain query separation
	return scalarDataArray?.map((scalarData) => {
		// Get query name from the first column
		const queryName = scalarData?.columns?.[0]?.queryName || '';

		if ((scalarData as any)?.aggregations?.length > 0) {
			return {
				...convertTimeSeriesData(scalarData as any, legendMap),
				table: {
					columns: [],
					rows: [],
				},
				list: null,
			};
		}

		// Collect columns for this specific query
		const columns = scalarData?.columns?.map((col) => ({
			name: getColName(col, legendMap, aggregationPerQuery),
			queryName: col.queryName,
			isValueColumn: col.columnType === 'aggregation',
			id: getColId(col, aggregationPerQuery),
		}));

		// Process rows for this specific query
		const rows = scalarData?.data?.map((dataRow) => {
			const rowData: Record<string, any> = {};

			scalarData?.columns?.forEach((col, colIndex) => {
				const columnName = getColName(col, legendMap, aggregationPerQuery);
				const columnId = getColId(col, aggregationPerQuery);
				rowData[columnId || columnName] = dataRow[colIndex];
			});

			return { data: rowData };
		});

		return {
			queryName,
			legend: legendMap[queryName] || '',
			series: null,
			list: null,
			table: {
				columns,
				rows,
			},
		};
	});
}

function convertScalarWithFormatForWeb(
	scalarDataArray: ScalarData[],
	legendMap: Record<string, string>,
	aggregationPerQuery: Record<string, any>,
): QueryDataV3[] {
	if (!scalarDataArray || scalarDataArray.length === 0) {
		return [];
	}

	return scalarDataArray.map((scalarData) => {
		const columns =
			scalarData.columns?.map((col) => {
				const colName = getColName(col, legendMap, aggregationPerQuery);

				return {
					name: colName,
					queryName: col.queryName,
					isValueColumn: col.columnType === 'aggregation',
					id: getColId(col, aggregationPerQuery),
				};
			}) || [];

		const rows =
			scalarData.data?.map((dataRow) => {
				const rowData: Record<string, any> = {};
				columns?.forEach((col, colIndex) => {
					rowData[col.id || col.name] = dataRow[colIndex];
				});
				return { data: rowData };
			}) || [];

		const queryName = scalarData.columns?.[0]?.queryName || '';

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
	});
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
	aggregationPerQuery: Record<string, any>,
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
			// For scalar data, combine all results into separate table entries
			const combinedTables = convertScalarDataArrayToTable(
				scalarData,
				legendMap,
				aggregationPerQuery,
			);
			return {
				resultType: 'scalar',
				result: combinedTables,
			};
		}
		case 'raw': {
			const rawData = v5Data.data.results as RawData[];
			return {
				resultType: 'raw',
				result: rawData.map((raw) => convertRawData(raw, legendMap)),
			};
		}
		case 'trace': {
			const traceData = v5Data.data.results as RawData[];
			return {
				resultType: 'trace',
				result: traceData.map((trace) => convertRawData(trace, legendMap)),
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
// eslint-disable-next-line sonarjs/cognitive-complexity
export function convertV5ResponseToLegacy(
	v5Response: SuccessResponse<MetricRangePayloadV5>,
	legendMap: Record<string, string>,
	formatForWeb?: boolean,
): SuccessResponse<MetricRangePayloadV3> & { warning?: Warning } {
	const { payload, params } = v5Response;
	const v5Data = payload?.data;

	const aggregationPerQuery =
		(params as QueryRangeRequestV5)?.compositeQuery?.queries
			?.filter((query) => query.type === 'builder_query')
			.reduce((acc, query) => {
				if (
					query.type === 'builder_query' &&
					'aggregations' in query.spec &&
					query.spec.name
				) {
					acc[query.spec.name] = query.spec.aggregations;
				}
				return acc;
			}, {} as Record<string, any>) || {};

	// If formatForWeb is true, return as-is (like existing logic)
	if (formatForWeb && v5Data?.type === 'scalar') {
		const scalarData = v5Data.data.results as ScalarData[];
		const webTables = convertScalarWithFormatForWeb(
			scalarData,
			legendMap,
			aggregationPerQuery,
		);

		return {
			...v5Response,
			payload: {
				data: {
					resultType: 'scalar',
					result: webTables,
					warnings: v5Data?.data?.warning || [],
				},
				warning: v5Data?.warning || undefined,
			},
			warning: v5Data?.warning || undefined,
		};
	}

	// Convert based on V5 response type
	const convertedData = convertV5DataByType(
		v5Data,
		legendMap,
		aggregationPerQuery,
	);

	// Create legacy-compatible response structure
	const legacyResponse: SuccessResponse<MetricRangePayloadV3> = {
		...v5Response,
		payload: {
			data: convertedData,
			warning: v5Response.payload?.data?.warning || undefined,
		},
	};

	// Apply legend mapping (similar to existing logic)
	if (legacyResponse.payload?.data?.result) {
		legacyResponse.payload.data.result = legacyResponse.payload.data.result.map(
			(queryData: any) => {
				// eslint-disable-line @typescript-eslint/no-explicit-any
				const newQueryData = cloneDeep(queryData);
				newQueryData.legend = legendMap[queryData.queryName];

				// If metric names is an empty object
				if (isEmpty(queryData.metric)) {
					// If metrics list is empty && the user haven't defined a legend then add the legend equal to the name of the query.
					if (newQueryData.legend === undefined || newQueryData.legend === null) {
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
