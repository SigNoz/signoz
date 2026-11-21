/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5LabelDTO } from './querybuildertypesv5LabelDTO';

export interface Querybuildertypesv5DistributionDTO {
	/**
	 * @type array,null
	 * @description One count per bound in meta.buckets plus a trailing overflow count, summed over every step of the requested time range.
	 */
	counts: number[] | null;
	/**
	 * @type array
	 * @description The group-by field values that identify this distribution.
	 */
	labels?: Querybuildertypesv5LabelDTO[];
}
