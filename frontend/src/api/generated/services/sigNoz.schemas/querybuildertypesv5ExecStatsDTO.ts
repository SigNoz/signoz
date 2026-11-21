/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5ExecStatsDTOStepIntervals } from './querybuildertypesv5ExecStatsDTOStepIntervals';

/**
 * Execution cost of the request: rows and bytes scanned and execution time. A measure of cost, not of whether data exists.
 */
export interface Querybuildertypesv5ExecStatsDTO {
	/**
	 * @type integer
	 * @minimum 0
	 * @description Bytes scanned to answer every query in the request. A cost indicator only; it does not indicate whether any data matched.
	 */
	bytesScanned?: number;
	/**
	 * @type integer
	 * @minimum 0
	 * @description Total execution time across the queries in the request, in milliseconds. A cost indicator only, not the request latency and not a sign that data exists.
	 */
	durationMs?: number;
	/**
	 * @type integer
	 * @minimum 0
	 * @description Rows scanned to answer every query in the request. A cost indicator only: rows are scanned whether or not any matched, so it says nothing about whether data exists.
	 */
	rowsScanned?: number;
	/**
	 * @type object
	 * @description The step interval in seconds that was used for each query, keyed by query name.
	 */
	stepIntervals?: Querybuildertypesv5ExecStatsDTOStepIntervals;
}
