/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { TelemetrytypesFieldContextDTO } from './telemetrytypesFieldContextDTO';
import type { TelemetrytypesFieldDataTypeDTO } from './telemetrytypesFieldDataTypeDTO';
import type { TelemetrytypesSignalDTO } from './telemetrytypesSignalDTO';
import type { TelemetrytypesSourceDTO } from './telemetrytypesSourceDTO';

export type GetRuleHistoryFilterValuesParams = {
	/**
	 * @description The signal to look up keys in: traces, logs or metrics. Empty searches every signal.
	 */
	signal?: TelemetrytypesSignalDTO;
	/**
	 * @description The data source within the signal. Use meter for Cost Meter metrics; empty means the default source.
	 */
	source?: TelemetrytypesSourceDTO;
	/**
	 * @type integer
	 * @description Maximum number of results per signal. Defaults to 1000 for keys and 50 for values. For keys, intrinsic and materialized fields are added on top, and an empty signal applies the limit to traces, logs and metrics separately, so the response can exceed it.
	 */
	limit?: number;
	/**
	 * @type integer
	 * @format int64
	 * @description Start of the lookup window in Unix milliseconds, rounded down to a 6 hour boundary. Ignored for key lookups and meter lookups; trace and log values apply it at calendar-day granularity; metric attribute values and relatedValues apply it. Omit for no lower bound.
	 */
	startUnixMilli?: number;
	/**
	 * @type integer
	 * @format int64
	 * @description End of the lookup window in Unix milliseconds. Ignored for key lookups, trace and log value lookups and meter lookups; applied to metric attribute values and relatedValues. Omit for no upper bound.
	 */
	endUnixMilli?: number;
	/**
	 * @description Restricts keys to one context: resource, attribute, scope, span, trace, log, body or metric. Applied to trace and log keys; metric attribute keys ignore it. Empty means any context.
	 */
	fieldContext?: TelemetrytypesFieldContextDTO;
	/**
	 * @description Restricts keys to one data type: string, bool, int64, float64 or number. Applied to trace and log keys; metric attribute keys ignore it. Empty means any type.
	 */
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
	/**
	 * @type string
	 * @description Restricts keys to those seen on this metric. Metrics signal only.
	 */
	metricName?: string;
	/**
	 * @type string
	 * @description Restricts keys to metrics in this namespace. Metrics signal only.
	 */
	metricNamespace?: string;
	/**
	 * @type string
	 * @description Substring to match: against key names for keys, against the values of name for values. Case-insensitive except for the meter source, where it is case-sensitive and % and _ act as wildcards. For keys, a context prefix such as resource.service.name sets fieldContext when it is empty.
	 */
	searchText?: string;
	/**
	 * @type string
	 * @description The key whose values to return, such as service.name. A context prefix such as resource.service.name sets fieldContext when it is empty.
	 */
	name?: string;
	/**
	 * @type string
	 * @description Filter expression already applied in the explorer. When set, relatedValues lists the values seen on data matching it.
	 */
	existingQuery?: string;
};
