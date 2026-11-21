/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5BucketOptionsDTO } from './querybuildertypesv5BucketOptionsDTO';
import type { Querybuildertypesv5FilterDTO } from './querybuildertypesv5FilterDTO';
import type { Querybuildertypesv5FunctionDTO } from './querybuildertypesv5FunctionDTO';
import type { Querybuildertypesv5GroupByKeyDTO } from './querybuildertypesv5GroupByKeyDTO';
import type { Querybuildertypesv5HavingDTO } from './querybuildertypesv5HavingDTO';
import type { Querybuildertypesv5LimitByDTO } from './querybuildertypesv5LimitByDTO';
import type { Querybuildertypesv5OrderByDTO } from './querybuildertypesv5OrderByDTO';
import type { Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTOSignal } from './querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTOSignal';
import type { Querybuildertypesv5SecondaryAggregationDTO } from './querybuildertypesv5SecondaryAggregationDTO';
import type { Querybuildertypesv5StepDTO } from './querybuildertypesv5StepDTO';
import type { Querybuildertypesv5TraceAggregationDTO } from './querybuildertypesv5TraceAggregationDTO';
import type { TelemetrytypesSourceDTO } from './telemetrytypesSourceDTO';
import type { TelemetrytypesTelemetryFieldKeyDTO } from './telemetrytypesTelemetryFieldKeyDTO';

export interface Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTO {
	/**
	 * @type array,null
	 * @description The aggregations to compute, one result per entry. Traces and logs take expressions such as count() or p99(duration_nano); metrics take a metricName with time and space aggregations. Omit for raw requests.
	 */
	aggregations?: Querybuildertypesv5TraceAggregationDTO[] | null;
	/**
	 * @description The value axis to count this query into, as a kind-discriminated linear or log bucket spec. Read only by heatmap requests, and only from the query they draw.
	 */
	bucketOptions?: Querybuildertypesv5BucketOptionsDTO;
	/**
	 * @type string
	 * @description The opaque nextCursor value from a previous raw result, used to fetch the next page. Honored only by raw requests whose order starts with timestamp, for logs followed by id in the same direction; every other request ignores it.
	 */
	cursor?: string;
	/**
	 * @type boolean
	 * @description When true, the result is excluded from the response; the query may still run and can still feed a formula or trace operator. Defaults to false.
	 */
	disabled?: boolean;
	/**
	 * @description The filter that selects spans, in the query filter syntax, for example service.name = 'frontend' AND http.response.status_code >= 500.
	 */
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type array,null
	 * @description Post-processing functions applied in order to each result series, such as absolute, cumulativeSum, timeShift or anomaly.
	 */
	functions?: Querybuildertypesv5FunctionDTO[] | null;
	/**
	 * @type array,null
	 * @description The fields to group aggregations by; each group becomes a series or a row with the field as a label or column.
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[] | null;
	/**
	 * @description A filter applied to aggregation results, referencing aliases or expressions, for example count() > 100.
	 */
	having?: Querybuildertypesv5HavingDTO;
	/**
	 * @type string
	 * @description The display name template for each series; {{field}} placeholders are replaced by group-by label values.
	 */
	legend?: string;
	/**
	 * @type integer
	 * @description The maximum number of rows for raw and trace requests, or of series or rows for grouped scalar and time_series requests, keeping the top entries by order. When 0, scalar and time_series requests are unlimited, raw requests ordered by timestamp return a page of 10000 rows to continue with nextCursor, and other raw and trace requests return 100 rows.
	 */
	limit?: number;
	/**
	 * @description Reserved for applying limit within each combination of the given group-by keys. Accepted but currently ignored.
	 */
	limitBy?: Querybuildertypesv5LimitByDTO;
	/**
	 * @type string
	 * @description The unique name of the query, such as A or B; formulas, trace operators and selectedQueryName refer to it.
	 */
	name?: string;
	/**
	 * @type integer
	 * @description The number of rows for raw and trace requests, or of ordered series or rows for scalar and time_series requests, to skip before the page starts. Requires limit. On raw requests the skip counts from where a cursor resumes, and the skipped rows are still read, so prefer cursor for paging.
	 */
	offset?: number;
	/**
	 * @type array,null
	 * @description The sort order of the result. Order by a group-by field, an aggregation alias, or for raw requests a selected field such as timestamp.
	 */
	order?: Querybuildertypesv5OrderByDTO[] | null;
	/**
	 * @type array,null
	 * @description Accepted but currently ignored, including their nested order, limit and limitBy.
	 */
	secondaryAggregations?: Querybuildertypesv5SecondaryAggregationDTO[] | null;
	/**
	 * @type array,null
	 * @description The fields to return for each row in raw requests, in addition to the columns always present: timestamp and id for logs, timestamp, trace_id and span_id for traces. Ignored by aggregating requests.
	 */
	selectFields?: TelemetrytypesTelemetryFieldKeyDTO[] | null;
	/**
	 * @enum traces
	 * @type string
	 * @description The telemetry signal to query: traces, logs or metrics. It selects the aggregation shape and is required for builder_query.
	 */
	signal: Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTOSignal;
	/**
	 * @description The data source within the signal. Set to meter for Cost Meter metrics; leave empty for regular telemetry.
	 */
	source?: TelemetrytypesSourceDTO;
	/**
	 * @description The time bucket for time_series aggregation: seconds as a number or a Go duration string such as 60s or 1m. Derived from the time range when omitted.
	 */
	stepInterval?: Querybuildertypesv5StepDTO;
}
