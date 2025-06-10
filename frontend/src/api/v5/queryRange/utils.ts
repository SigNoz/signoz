import {
	BuilderQuery,
	CompositeQuery,
	LogBuilderQuery,
	MetricBuilderQuery,
	QueryEnvelope,
	QueryRangeRequestV5,
	RequestType,
	TraceBuilderQuery,
} from 'types/api/v5/queryRange';

// ===================== Query Builder Utilities =====================

/**
 * Creates a trace builder query
 */
export function createTraceBuilderQuery(
	name: string,
	config: Omit<TraceBuilderQuery, 'signal'>,
): TraceBuilderQuery {
	return {
		signal: 'traces',
		...config,
	};
}

/**
 * Creates a log builder query
 */
export function createLogBuilderQuery(
	name: string,
	config: Omit<LogBuilderQuery, 'signal'>,
): LogBuilderQuery {
	return {
		signal: 'logs',
		...config,
	};
}

/**
 * Creates a metric builder query
 */
export function createMetricBuilderQuery(
	name: string,
	config: Omit<MetricBuilderQuery, 'signal'>,
): MetricBuilderQuery {
	return {
		signal: 'metrics',
		...config,
	};
}

/**
 * Creates a query envelope from a builder query
 */
export function createQueryEnvelope(
	name: string,
	spec: BuilderQuery,
): QueryEnvelope {
	return {
		name,
		type: 'builder_query',
		spec,
	};
}

/**
 * Creates a composite query from multiple query envelopes
 */
export function createCompositeQuery(queries: QueryEnvelope[]): CompositeQuery {
	return {
		queries,
	};
}

/**
 * Creates a complete V5 query range request
 */
export function createQueryRangeRequest(
	start: number,
	end: number,
	requestType: RequestType,
	compositeQuery: CompositeQuery,
	options?: {
		schemaVersion?: string;
		variables?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
	},
): QueryRangeRequestV5 {
	return {
		schemaVersion: options?.schemaVersion || 'v5',
		start,
		end,
		requestType,
		compositeQuery,
		variables: options?.variables,
	};
}

// ===================== Validation Utilities =====================

/**
 * Validates basic request properties
 */
function validateBasicProperties(request: QueryRangeRequestV5): string[] {
	const errors: string[] = [];

	if (!request.schemaVersion) {
		errors.push('schemaVersion is required');
	}

	if (!request.start || request.start <= 0) {
		errors.push('start time must be a positive number');
	}

	if (!request.end || request.end <= 0) {
		errors.push('end time must be a positive number');
	}

	if (request.start >= request.end) {
		errors.push('start time must be before end time');
	}

	if (!request.requestType) {
		errors.push('requestType is required');
	}

	return errors;
}

/**
 * Validates composite query structure
 */
function validateCompositeQuery(compositeQuery?: CompositeQuery): string[] {
	const errors: string[] = [];

	if (
		!compositeQuery ||
		!compositeQuery.queries ||
		compositeQuery.queries.length === 0
	) {
		errors.push('compositeQuery must contain at least one query');
		return errors;
	}

	compositeQuery.queries.forEach((query, index) => {
		if (!query.name) {
			errors.push(`Query at index ${index} must have a name`);
		}
		if (!query.type) {
			errors.push(`Query at index ${index} must have a type`);
		}
		if (!query.spec) {
			errors.push(`Query at index ${index} must have a spec`);
		}
	});

	return errors;
}

/**
 * Validates a query range request
 */
export function validateQueryRangeRequest(
	request: QueryRangeRequestV5,
): { isValid: boolean; errors: string[] } {
	const errors = [
		...validateBasicProperties(request),
		...validateCompositeQuery(request.compositeQuery),
	];

	return {
		isValid: errors.length === 0,
		errors,
	};
}

// ===================== Time Utilities =====================

/**
 * Converts a time string to epoch milliseconds
 */
export function parseTimeToEpoch(time: string | number): number {
	if (typeof time === 'number') {
		return time;
	}

	const parsed = Date.parse(time);
	if (Number.isNaN(parsed)) {
		throw new Error(`Invalid time format: ${time}`);
	}

	return parsed;
}

/**
 * Creates a time range for the last N minutes
 */
export function createTimeRangeFromMinutes(
	minutes: number,
): { start: number; end: number } {
	const end = Date.now();
	const start = end - minutes * 60 * 1000;

	return { start, end };
}

/**
 * Creates a time range for the last N hours
 */
export function createTimeRangeFromHours(
	hours: number,
): { start: number; end: number } {
	const end = Date.now();
	const start = end - hours * 60 * 60 * 1000;

	return { start, end };
}

// ===================== Filter Utilities =====================

/**
 * Creates a simple equality filter expression
 */
export function createEqualityFilter(key: string, value: string): string {
	return `${key} = '${value}'`;
}

/**
 * Creates an AND filter expression from multiple conditions
 */
export function createAndFilter(conditions: string[]): string {
	return conditions.join(' AND ');
}

/**
 * Creates an OR filter expression from multiple conditions
 */
export function createOrFilter(conditions: string[]): string {
	return conditions.join(' OR ');
}

/**
 * Creates a filter for multiple values using OR
 */
export function createInFilter(key: string, values: string[]): string {
	const conditions = values.map((value) => `${key} = '${value}'`);
	return createOrFilter(conditions);
}
