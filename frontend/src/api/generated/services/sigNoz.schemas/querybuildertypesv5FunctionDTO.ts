/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5FunctionArgDTO } from './querybuildertypesv5FunctionArgDTO';
import type { Querybuildertypesv5FunctionNameDTO } from './querybuildertypesv5FunctionNameDTO';

export interface Querybuildertypesv5FunctionDTO {
	/**
	 * @type array,null
	 * @description The function arguments; which ones are required depends on the function, for example a threshold for the cutOff and clamp functions.
	 */
	args?: Querybuildertypesv5FunctionArgDTO[] | null;
	/**
	 * @description The function to apply, such as cutOffMin, cutOffMax, clampMin, clampMax, absolute, runningDiff, log2, log10, cumulativeSum, ewma3, ewma5, ewma7, median3, median5, median7, timeShift, anomaly or fillZero.
	 */
	name?: Querybuildertypesv5FunctionNameDTO;
}
