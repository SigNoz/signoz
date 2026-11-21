/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5StepDTO } from './querybuildertypesv5StepDTO';

export interface Querybuildertypesv5PromQueryDTO {
	/**
	 * @type boolean
	 * @description When true, the result is excluded from the response but the query may still run. Defaults to false.
	 */
	disabled?: boolean;
	/**
	 * @type string
	 * @description The display name template for each series; {{label}} placeholders are replaced by label values.
	 */
	legend?: string;
	/**
	 * @type string
	 * @description The unique name of the query, such as A.
	 */
	name?: string;
	/**
	 * @type string
	 * @description The PromQL expression. Dotted metric and label names must use the UTF-8 quoted selector form, for example {'http.server.duration'}.
	 */
	query?: string;
	/**
	 * @type boolean
	 * @description When true, start and end are evaluated as given instead of rounded down to the step, and the result is not cached. Defaults to false.
	 */
	skipStepAlignment?: boolean;
	/**
	 * @type boolean
	 * @description Reserved; currently has no effect.
	 */
	stats?: boolean;
	/**
	 * @description The evaluation step: seconds as a number or a Go duration string such as 60s. Derived from the time range when omitted.
	 */
	step?: Querybuildertypesv5StepDTO;
}
