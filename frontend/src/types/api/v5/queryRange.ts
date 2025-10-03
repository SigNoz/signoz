// ===================== Base Types =====================

import { Warning } from '..';

export type Step = string | number; // Duration string (e.g., "30s") or seconds as number

export type RequestType =
	| 'scalar'
	| 'time_series'
	| 'trace'
	| 'raw'
	| 'distribution'
	| '';

export type QueryType =
	| 'builder_query'
	| 'builder_trace_operator'
	| 'builder_formula'
	| 'builder_sub_query'
	| 'builder_join'
	| 'clickhouse_sql'
	| 'promql';

export type OrderDirection = 'asc' | 'desc';

export type JoinType = 'inner' | 'left' | 'right' | 'full' | 'cross';

export type SignalType = 'traces' | 'logs' | 'metrics';

export type DataType = 'string' | 'number' | 'boolean' | 'array';

export type FieldType =
	| 'resource'
	| 'attribute'
	| 'instrumentation_library'
	| 'span';

export type FieldContext =
	| 'metric'
	| 'log'
	| 'span'
	| 'trace'
	| 'resource'
	| 'scope'
	| 'attribute'
	| 'event'
	| '';

export type FieldDataType =
	| 'string'
	| 'bool'
	| 'float64'
	| 'int64'
	| 'number'
	| '[]string'
	| '[]float64'
	| '[]bool'
	| '[]int64'
	| '[]number'
	| '';

export type FunctionName =
	| 'cutOffMin'
	| 'cutOffMax'
	| 'clampMin'
	| 'clampMax'
	| 'absolute'
	| 'runningDiff'
	| 'log2'
	| 'log10'
	| 'cumulativeSum'
	| 'ewma3'
	| 'ewma5'
	| 'ewma7'
	| 'median3'
	| 'median5'
	| 'median7'
	| 'timeShift'
	| 'anomaly';

export type Temporality = 'cumulative' | 'delta' | '';

export type MetricType =
	| 'gauge'
	| 'sum'
	| 'histogram'
	| 'summary'
	| 'exponential_histogram'
	| '';

export type TimeAggregation =
	| 'latest'
	| 'sum'
	| 'avg'
	| 'min'
	| 'max'
	| 'count'
	| 'count_distinct'
	| 'rate'
	| 'increase'
	| '';

export type SpaceAggregation =
	| 'sum'
	| 'avg'
	| 'min'
	| 'max'
	| 'count'
	| 'p50'
	| 'p75'
	| 'p90'
	| 'p95'
	| 'p99'
	| '';

export type ColumnType = 'group' | 'aggregation';

// ===================== Variable Types =====================

export type VariableType = 'query' | 'dynamic' | 'custom' | 'text';

export interface VariableItem {
	type?: VariableType;
	value: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// ===================== Core Interface Types =====================

export interface TelemetryFieldKey {
	name: string;
	key?: string;
	description?: string;
	unit?: string;
	signal?: SignalType;
	fieldContext?: FieldContext;
	fieldDataType?: FieldDataType;
	materialized?: boolean;
	isIndexed?: boolean;
}

export interface Filter {
	expression: string;
}

export interface Having {
	expression: string;
}

export type GroupByKey = TelemetryFieldKey;

export interface OrderBy {
	key: TelemetryFieldKey;
	direction: OrderDirection;
}

export interface LimitBy {
	keys: string[];
	value: string;
}

export interface QueryRef {
	name: string;
}

export interface FunctionArg {
	name?: string;
	value: string | number;
}

export interface QueryFunction {
	name: FunctionName;
	args?: FunctionArg[];
	namedArgs?: Record<string, string | number>;
}

// ===================== Aggregation Types =====================

export interface TraceAggregation {
	expression: string;
	alias?: string;
}

export interface LogAggregation {
	expression: string;
	alias?: string;
}

export interface MetricAggregation {
	metricName: string;
	temporality: Temporality;
	timeAggregation: TimeAggregation;
	spaceAggregation: SpaceAggregation;
	reduceTo?: string;
}

export interface SecondaryAggregation {
	stepInterval?: Step;
	expression: string;
	alias?: string;
	groupBy?: GroupByKey[];
	order?: OrderBy[];
	limit?: number;
	limitBy?: LimitBy;
}

// ===================== Query Types =====================

export interface BaseBuilderQuery {
	name?: string;
	stepInterval?: Step | null;
	disabled?: boolean;
	filter?: Filter;
	groupBy?: GroupByKey[];
	order?: OrderBy[];
	selectFields?: TelemetryFieldKey[];
	limit?: number;
	limitBy?: LimitBy;
	offset?: number;
	cursor?: string;
	having?: Having;
	secondaryAggregations?: SecondaryAggregation[];
	functions?: QueryFunction[];
	legend?: string;
	expression?: string; // for trace operator
}

export interface TraceBuilderQuery extends BaseBuilderQuery {
	signal: 'traces';
	aggregations?: TraceAggregation[];
}

export interface LogBuilderQuery extends BaseBuilderQuery {
	signal: 'logs';
	aggregations?: LogAggregation[];
}

export interface MetricBuilderQuery extends BaseBuilderQuery {
	signal: 'metrics';
	aggregations?: MetricAggregation[];
}

export interface MeterBuilderQuery extends BaseBuilderQuery {
	signal: 'metrics';
	source: 'meter';
	aggregations?: MetricAggregation[];
}

export type BuilderQuery =
	| TraceBuilderQuery
	| LogBuilderQuery
	| MetricBuilderQuery
	| MeterBuilderQuery;

export interface QueryBuilderFormula {
	name: string;
	expression: string;
	functions?: QueryFunction[];
	order?: OrderBy[];
	limit?: number;
	having?: Having;
	legend?: string;
}

export interface QueryBuilderJoin {
	name: string;
	disabled?: boolean;
	left: QueryRef;
	right: QueryRef;
	type: JoinType;
	on: string;
	aggregations?: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
	selectFields?: TelemetryFieldKey[];
	filter?: Filter;
	groupBy?: GroupByKey[];
	having?: Having;
	order?: OrderBy[];
	limit?: number;
	secondaryAggregations?: SecondaryAggregation[];
	functions?: QueryFunction[];
}

export interface PromQuery {
	name: string;
	query: string;
	disabled?: boolean;
	step?: Step;
	stats?: boolean;
	legend?: string;
}

export interface ClickHouseQuery {
	name: string;
	query: string;
	disabled?: boolean;
	legend?: string;
}

// ===================== Query Envelope =====================

export interface QueryEnvelope {
	type: QueryType;
	spec:
		| BuilderQuery // Will be same for both builder_query and builder_sub_query
		| QueryBuilderFormula
		| QueryBuilderJoin
		| PromQuery
		| ClickHouseQuery;
}

export interface CompositeQuery {
	queries: QueryEnvelope[];
}

// ===================== Request Types =====================

export interface QueryRangeRequestV5 {
	schemaVersion: string;
	start: number; // epoch milliseconds
	end: number; // epoch milliseconds
	requestType: RequestType;
	compositeQuery: CompositeQuery;
	variables?: Record<string, VariableItem>;
	formatOptions?: {
		formatTableResultForUI: boolean;
		fillGaps?: boolean;
	};
}

// ===================== Response Types =====================

export interface ExecStats {
	rowsScanned: number;
	bytesScanned: number;
	durationMs: number;
}

export interface Label {
	key: TelemetryFieldKey;
	value: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface Bucket {
	step: number;
}

export interface TimeSeriesValue {
	timestamp: number; // Unix timestamp in milliseconds
	value: number;
	values?: number[]; // For heatmap type charts
	bucket?: Bucket;
	partial?: boolean;
}

export interface TimeSeries {
	labels?: Label[];
	values: TimeSeriesValue[];
}

export interface AggregationBucket {
	index: number;
	alias: string;
	meta: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
	series: TimeSeries[];
	predictedSeries?: TimeSeries[];
	upperBoundSeries?: TimeSeries[];
	lowerBoundSeries?: TimeSeries[];
	anomalyScores?: TimeSeries[];
}

export interface TimeSeriesData {
	queryName: string;
	aggregations: AggregationBucket[];
}

export interface ColumnDescriptor extends TelemetryFieldKey {
	queryName: string;
	aggregationIndex: number;
	columnType: ColumnType;
	meta?: {
		unit?: string;
	};
}

export interface ScalarData {
	columns: ColumnDescriptor[];
	data: any[][]; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface RawRow {
	timestamp: string; // ISO date-time
	data: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface RawData {
	queryName: string;
	nextCursor?: string;
	rows: RawRow[];
}

export interface DistributionData {
	// Structure to be defined based on requirements
	[key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// Response data structures with results array
export interface TimeSeriesResponseData {
	results: TimeSeriesData[];
}

export interface ScalarResponseData {
	results: ScalarData[];
}

export interface RawResponseData {
	results: RawData[];
}

export interface DistributionResponseData {
	results: DistributionData[];
}

export type QueryRangeDataV5 =
	| TimeSeriesResponseData
	| ScalarResponseData
	| RawResponseData
	| DistributionResponseData;

export interface QueryRangeResponseV5 {
	type: RequestType;
	data: QueryRangeDataV5 & { warning?: string[] };
	meta: ExecStats;
	warning?: Warning;
}

// ===================== Payload Types for API Functions =====================

export type QueryRangePayloadV5 = QueryRangeRequestV5;

export interface MetricRangePayloadV5 {
	data: QueryRangeResponseV5;
}
