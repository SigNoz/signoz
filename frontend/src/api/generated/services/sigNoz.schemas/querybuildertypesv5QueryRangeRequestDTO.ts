/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5CompositeQueryDTO } from './querybuildertypesv5CompositeQueryDTO';
import type { Querybuildertypesv5FormatOptionsDTO } from './querybuildertypesv5FormatOptionsDTO';
import type { Querybuildertypesv5QueryRangeRequestDTOVariables } from './querybuildertypesv5QueryRangeRequestDTOVariables';
import type { Querybuildertypesv5RequestTypeDTO } from './querybuildertypesv5RequestTypeDTO';

/**
 * Request body for the v5 query range endpoint. Supports builder queries (traces, logs, metrics), formulas, trace operators, PromQL, and ClickHouse SQL queries.
 */
export interface Querybuildertypesv5QueryRangeRequestDTO {
	/**
	 * @description The queries to execute together; at least one is required and formulas may reference the others by name.
	 */
	compositeQuery?: Querybuildertypesv5CompositeQueryDTO;
	/**
	 * @type integer
	 * @minimum 0
	 * @description The end of the time range as a Unix timestamp in milliseconds; must be greater than start except for raw_stream requests.
	 */
	end?: number;
	/**
	 * @description Post-processing applied to the result before it is returned.
	 */
	formatOptions?: Querybuildertypesv5FormatOptionsDTO;
	/**
	 * @type boolean
	 * @description When true, results are computed fresh instead of being served from the query result cache. Defaults to false.
	 */
	noCache?: boolean;
	/**
	 * @description The shape of the result: scalar, time_series, raw, raw_stream, trace, distribution or heatmap. It decides which result type data.results carries.
	 */
	requestType?: Querybuildertypesv5RequestTypeDTO;
	/**
	 * @type string
	 * @description The version of the request payload schema, currently v1.
	 */
	schemaVersion?: string;
	/**
	 * @type integer
	 * @minimum 0
	 * @description The inclusive start of the time range as a Unix timestamp in milliseconds.
	 */
	start?: number;
	/**
	 * @type object
	 * @description Dashboard variable values keyed by variable name. Builder filters substitute only the $name form and leave a quoted {{name}} unchanged; PromQL and ClickHouse SQL substitute $name, {{name}}, [[name]] and the Go template form {{.name}}.
	 */
	variables?: Querybuildertypesv5QueryRangeRequestDTOVariables;
}
