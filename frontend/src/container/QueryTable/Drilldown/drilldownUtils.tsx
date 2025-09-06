import { PieArcDatum } from '@visx/shape/lib/shapes/Pie';
import { convertFiltersToExpressionWithExistingQuery } from 'components/QueryBuilderV2/utils';
import {
	initialQueryBuilderFormValuesMap,
	OPERATORS,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import cloneDeep from 'lodash-es/cloneDeep';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	Query,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

export function getBaseMeta(
	query: Query,
	filterKey: string,
): BaseAutocompleteData | null {
	const steps = query.builder.queryData;
	for (let i = 0; i < steps.length; i++) {
		const { groupBy = [] } = steps[i];
		for (let j = 0; j < groupBy.length; j++) {
			if (groupBy[j].key === filterKey) {
				return groupBy[j];
			}
		}
	}
	return null;
}

export const getRoute = (key: string): string => {
	switch (key) {
		case 'view_logs':
			return ROUTES.LOGS_EXPLORER;
		case 'view_metrics':
			return ROUTES.METRICS_EXPLORER;
		case 'view_traces':
			return ROUTES.TRACES_EXPLORER;
		default:
			return '';
	}
};

export const isNumberDataType = (dataType: DataTypes | undefined): boolean => {
	if (!dataType) return false;
	return dataType === DataTypes.Int64 || dataType === DataTypes.Float64;
};

export interface FilterData {
	filterKey: string;
	filterValue: string | number;
	operator: string;
}

// Helper function to avoid code duplication
function addFiltersToQuerySteps(
	query: Query,
	filters: FilterData[],
	queryName?: string,
): Query {
	// 1) clone so we don't mutate the original
	const q = cloneDeep(query);

	// 2) map over builder.queryData to return a new modified version
	q.builder.queryData = q.builder.queryData.map((step) => {
		// Only modify the step that matches the queryName (if provided)
		if (queryName && step.queryName !== queryName) {
			return step;
		}

		// 3) build the new filters array
		const newFilters = {
			...step.filters,
			op: step?.filters?.op || 'AND',
			items: [...(step?.filters?.items || [])],
		};

		// Add each filter to the items array
		filters.forEach(({ filterKey, filterValue, operator }) => {
			// skip if this step doesn't group by our key
			const baseMeta = step.groupBy.find((g) => g.key === filterKey);
			if (!baseMeta) return;

			newFilters.items.push({
				id: uuid(),
				key: baseMeta,
				op: operator,
				value: filterValue,
			});
		});

		const resolvedFilters = convertFiltersToExpressionWithExistingQuery(
			newFilters,
			step.filter?.expression,
		);

		// 4) return a new step object with updated filters
		return {
			...step,
			...resolvedFilters,
		};
	});

	return q;
}

export function addFilterToQuery(query: Query, filters: FilterData[]): Query {
	return addFiltersToQuerySteps(query, filters);
}

export const addFilterToSelectedQuery = (
	query: Query,
	filters: FilterData[],
	queryName: string,
): Query => addFiltersToQuerySteps(query, filters, queryName);

export const getAggregateColumnHeader = (
	query: Query,
	queryName: string,
): { dataSource: string; aggregations: string } => {
	// Find the query step with the matching queryName
	const queryStep = query?.builder?.queryData.find(
		(step) => step.queryName === queryName,
	);

	if (!queryStep) {
		return { dataSource: '', aggregations: '' };
	}

	const { dataSource, aggregations } = queryStep; // TODO: check if this is correct

	// Extract aggregation expressions based on data source type
	let aggregationExpressions: string[] = [];

	if (aggregations && aggregations.length > 0) {
		if (dataSource === 'metrics') {
			// For metrics, construct expression from spaceAggregation(metricName)
			aggregationExpressions = aggregations.map((agg: any) => {
				const { spaceAggregation, metricName } = agg;
				return `${spaceAggregation}(${metricName})`;
			});
		} else {
			// For traces and logs, use the expression field directly
			aggregationExpressions = aggregations.map((agg: any) => agg.expression);
		}
	}

	return {
		dataSource,
		aggregations: aggregationExpressions.join(', '),
	};
};

const getFiltersFromMetric = (metric: any): FilterData[] =>
	Object.keys(metric).map((key) => ({
		filterKey: key,
		filterValue: metric[key],
		operator: OPERATORS['='],
	}));

export const getUplotClickData = ({
	metric,
	queryData,
	absoluteMouseX,
	absoluteMouseY,
	focusedSeries,
}: {
	metric?: { [key: string]: string };
	queryData?: { queryName: string; inFocusOrNot: boolean };
	absoluteMouseX: number;
	absoluteMouseY: number;
	focusedSeries?: {
		seriesIndex: number;
		seriesName: string;
		value: number;
		color: string;
		show: boolean;
		isFocused: boolean;
	} | null;
}): {
	coord: { x: number; y: number };
	record: { queryName: string; filters: FilterData[] };
	label: string | React.ReactNode;
} | null => {
	if (!queryData?.queryName || !metric) {
		return null;
	}

	const record = {
		queryName: queryData.queryName,
		filters: getFiltersFromMetric(metric),
	};

	// Generate label from focusedSeries data
	let label: string | React.ReactNode = '';
	if (focusedSeries && focusedSeries.seriesName) {
		label = (
			<span style={{ color: focusedSeries.color }}>
				{focusedSeries.seriesName}
			</span>
		);
	}

	return {
		coord: {
			x: absoluteMouseX,
			y: absoluteMouseY,
		},
		record,
		label,
	};
};

export const getPieChartClickData = (
	arc: PieArcDatum<{
		label: string;
		value: string;
		color: string;
		record: any;
	}>,
): {
	queryName: string;
	filters: FilterData[];
	label: string | React.ReactNode;
} | null => {
	const { metric, queryName } = arc.data.record;
	if (!queryName || !metric) return null;

	const label = <span style={{ color: arc.data.color }}>{arc.data.label}</span>;
	return {
		queryName,
		filters: getFiltersFromMetric(metric), // TODO: add where clause query as well.
		label,
	};
};

/**
 * Gets the query data that matches the aggregate data's queryName
 */
export const getQueryData = (
	query: Query,
	queryName: string,
): IBuilderQuery => {
	const queryData = query?.builder?.queryData?.filter(
		(item: IBuilderQuery) => item.queryName === queryName,
	);
	return queryData[0];
};

/**
 * Checks if a query name is valid for drilldown operations
 * Returns false if queryName is empty or starts with 'F'
 * Note: Checking if queryName starts with 'F' is a hack to know if it's a Formulae based query
 */
export const isValidQueryName = (queryName: string): boolean => {
	if (!queryName || queryName.trim() === '') {
		return false;
	}
	return !queryName.startsWith('F');
};

const VIEW_QUERY_MAP: Record<string, IBuilderQuery> = {
	view_logs: initialQueryBuilderFormValuesMap.logs,
	view_metrics: initialQueryBuilderFormValuesMap.metrics,
	view_traces: initialQueryBuilderFormValuesMap.traces,
};

/**
 * TEMP LOGIC - TO BE REMOVED LATER
 * Transforms metric query filters to logs/traces format
 * Applies the following transformations:
 * - Rule 2: operation → name
 * - Rule 3: span.kind → kind
 * - Rule 4: status.code → status_code_string with value mapping
 * - Rule 5: http.status_code type conversion
 */
const transformMetricsToLogsTraces = (
	filterExpression: string | undefined,
): string | undefined => {
	if (!filterExpression) return filterExpression;

	// ===========================================
	// MAPPING OBJECTS - ALL TRANSFORMATIONS DEFINED HERE
	// ===========================================
	const METRIC_TO_LOGS_TRACES_MAPPINGS = {
		// Rule 2: operation → name
		attributeRenames: {
			operation: 'name',
		},

		// Rule 3: span.kind → kind with value mapping
		spanKindMapping: {
			attribute: 'span.kind',
			newAttribute: 'kind',
			valueMappings: {
				SPAN_KIND_INTERNAL: '1',
				SPAN_KIND_SERVER: '2',
				SPAN_KIND_CLIENT: '3',
				SPAN_KIND_PRODUCER: '4',
				SPAN_KIND_CONSUMER: '5',
			},
		},

		// Rule 4: status.code → status_code_string with value mapping
		statusCodeMapping: {
			attribute: 'status.code',
			newAttribute: 'status_code_string',
			valueMappings: {
				// From metrics format → To logs/traces format
				STATUS_CODE_UNSET: 'Unset',
				STATUS_CODE_OK: 'Ok',
				STATUS_CODE_ERROR: 'Error',
			},
		},

		// Rule 5: http.status_code type conversion
		typeConversions: {
			'http.status_code': 'number',
		},
	};
	// ===========================================

	let transformedExpression = filterExpression;

	// Apply attribute renames
	Object.entries(METRIC_TO_LOGS_TRACES_MAPPINGS.attributeRenames).forEach(
		([oldAttr, newAttr]) => {
			const regex = new RegExp(`\\b${oldAttr}\\b`, 'g');
			transformedExpression = transformedExpression.replace(regex, newAttr);
		},
	);

	// Apply span.kind → kind transformation
	const { spanKindMapping } = METRIC_TO_LOGS_TRACES_MAPPINGS;
	if (spanKindMapping) {
		// Replace attribute name - use word boundaries to avoid partial matches
		const attrRegex = new RegExp(
			`\\b${spanKindMapping.attribute.replace(/\./g, '\\.')}\\b`,
			'g',
		);
		transformedExpression = transformedExpression.replace(
			attrRegex,
			spanKindMapping.newAttribute,
		);

		// Replace values
		Object.entries(spanKindMapping.valueMappings).forEach(
			([oldValue, newValue]) => {
				const valueRegex = new RegExp(`\\b${oldValue}\\b`, 'g');
				transformedExpression = transformedExpression.replace(valueRegex, newValue);
			},
		);
	}

	// Apply status.code → status_code_string transformation
	const { statusCodeMapping } = METRIC_TO_LOGS_TRACES_MAPPINGS;
	if (statusCodeMapping) {
		// Replace attribute name - use word boundaries to avoid partial matches
		// This prevents http.status_code from being transformed
		const attrRegex = new RegExp(
			`\\b${statusCodeMapping.attribute.replace(/\./g, '\\.')}\\b`,
			'g',
		);
		transformedExpression = transformedExpression.replace(
			attrRegex,
			statusCodeMapping.newAttribute,
		);

		// Replace values
		Object.entries(statusCodeMapping.valueMappings).forEach(
			([oldValue, newValue]) => {
				const valueRegex = new RegExp(`\\b${oldValue}\\b`, 'g');
				transformedExpression = transformedExpression.replace(
					valueRegex,
					`${newValue}`,
				);
			},
		);
	}

	// Note: Type conversions (Rule 5) would need more complex parsing
	// of the filter expression to implement properly

	return transformedExpression;
};

export const getViewQuery = (
	query: Query,
	filtersToAdd: FilterData[],
	key: string,
	queryName: string,
): Query | null => {
	const newQuery = cloneDeep(query);

	const queryBuilderData = VIEW_QUERY_MAP[key];

	if (!queryBuilderData) return null;

	let existingFilters: TagFilterItem[] = [];
	let existingFilterExpression: string | undefined;
	if (queryName) {
		const queryData = getQueryData(query, queryName);
		existingFilters = queryData?.filters?.items || [];
		existingFilterExpression = queryData?.filter?.expression;
	}

	newQuery.builder.queryData = [queryBuilderData];

	const filters = filtersToAdd.reduce((acc: any[], filter) => {
		// use existing query to get baseMeta
		const baseMeta = getBaseMeta(query, filter.filterKey);
		if (!baseMeta) return acc;

		acc.push({
			id: uuid(),
			key: baseMeta,
			op: filter.operator,
			value: filter.filterValue,
		});

		return acc;
	}, []);

	const allFilters = [...existingFilters, ...filters];

	const {
		// filters: newFilters,
		filter: newFilterExpression,
	} = convertFiltersToExpressionWithExistingQuery(
		{
			items: allFilters,
			op: 'AND',
		},
		existingFilterExpression,
	);

	// newQuery.builder.queryData[0].filters = newFilters;

	newQuery.builder.queryData[0].filter = newFilterExpression;

	try {
		// ===========================================
		// TEMP LOGIC - TO BE REMOVED LATER
		// ===========================================
		// Apply metric-to-logs/traces transformations
		if (key === 'view_logs' || key === 'view_traces') {
			const transformedExpression = transformMetricsToLogsTraces(
				newFilterExpression?.expression,
			);
			newQuery.builder.queryData[0].filter = {
				expression: transformedExpression || '',
			};
		}
		// ===========================================
	} catch (error) {
		console.error('Error transforming metrics to logs/traces:', error);
	}

	return newQuery;
};

export function isDrilldownEnabled(): boolean {
	return true;
	// temp code
	// if (typeof window === 'undefined') return false;
	// const drilldownValue = window.localStorage.getItem('drilldown');
	// return drilldownValue === 'true';
}
