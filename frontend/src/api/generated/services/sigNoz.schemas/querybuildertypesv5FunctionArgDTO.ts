/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5FunctionArgDTOValue } from './querybuildertypesv5FunctionArgDTOValue';

export interface Querybuildertypesv5FunctionArgDTO {
	/**
	 * @type string
	 * @description The argument name for functions that take named arguments, such as z_score_threshold or seasonality for anomaly.
	 */
	name?: string;
	/**
	 * @description The argument value as a number, string or boolean, for example the threshold for cutOffMin or the duration for timeShift.
	 */
	value?: Querybuildertypesv5FunctionArgDTOValue;
}
