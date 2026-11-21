/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5FilterDTO } from './querybuildertypesv5FilterDTO';
import type { Querybuildertypesv5FunctionDTO } from './querybuildertypesv5FunctionDTO';
import type { Querybuildertypesv5GroupByKeyDTO } from './querybuildertypesv5GroupByKeyDTO';
import type { Querybuildertypesv5HavingDTO } from './querybuildertypesv5HavingDTO';
import type { Querybuildertypesv5OrderByDTO } from './querybuildertypesv5OrderByDTO';
import type { Querybuildertypesv5StepDTO } from './querybuildertypesv5StepDTO';
import type { Querybuildertypesv5TraceAggregationDTO } from './querybuildertypesv5TraceAggregationDTO';
import type { TelemetrytypesTelemetryFieldKeyDTO } from './telemetrytypesTelemetryFieldKeyDTO';

export interface Querybuildertypesv5QueryBuilderTraceOperatorDTO {
	/**
	 * @type array,null
	 * @description The aggregations to compute over the matched traces for scalar and time_series requests.
	 */
	aggregations?: Querybuildertypesv5TraceAggregationDTO[] | null;
	/**
	 * @type string
	 * @description Accepted but currently ignored by the trace operator; page raw results with offset.
	 */
	cursor?: string;
	/**
	 * @type boolean
	 * @description When true, the result is excluded from the response but the query may still run. Defaults to false.
	 */
	disabled?: boolean;
	/**
	 * @type string
	 * @description A trace-structure expression over traces builder query names using => for direct child, -> for descendant, && for both present, || for either present and NOT for absence, for example A => B && NOT C. At most 10 operators.
	 */
	expression?: string;
	/**
	 * @description Accepted but currently not applied to the matched traces. Put filters on the operand queries instead.
	 */
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type array,null
	 * @description Post-processing functions applied in order to each result series.
	 */
	functions?: Querybuildertypesv5FunctionDTO[] | null;
	/**
	 * @type array,null
	 * @description The fields to group aggregations by.
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[] | null;
	/**
	 * @description A condition on the aggregation results, for example count() > 10.
	 */
	having?: Querybuildertypesv5HavingDTO;
	/**
	 * @type string
	 * @description The display name template for each series; {{field}} placeholders are replaced by group-by label values.
	 */
	legend?: string;
	/**
	 * @type integer
	 * @description The maximum number of traces or groups to return. For raw requests 0 means 100 rows; for aggregations 0 means unlimited.
	 */
	limit?: number;
	/**
	 * @type string
	 * @description The unique name of the trace operator query.
	 */
	name?: string;
	/**
	 * @type integer
	 * @description The number of raw or trace rows, or of ordered series or rows for time_series and scalar requests, to skip before the page starts. Requires limit.
	 */
	offset?: number;
	/**
	 * @type array,null
	 * @description The sort order of the matched traces; only span_count and trace_duration may be used as keys.
	 */
	order?: Querybuildertypesv5OrderByDTO[] | null;
	/**
	 * @type string
	 * @description The name of the operand query whose spans are returned; when empty, the spans matched by the whole expression are returned.
	 */
	returnSpansFrom?: string;
	/**
	 * @type array,null
	 * @description The span fields to return for each row in raw requests, in addition to the always-present timestamp, trace_id and span_id columns.
	 */
	selectFields?: TelemetrytypesTelemetryFieldKeyDTO[] | null;
	/**
	 * @description The time bucket for time_series aggregation: seconds as a number or a Go duration string such as 60s.
	 */
	stepInterval?: Querybuildertypesv5StepDTO;
}
