/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5BucketOptionsLinearDTOKind } from './querybuildertypesv5BucketOptionsLinearDTOKind';
import type { Querybuildertypesv5LinearBucketsSpecDTO } from './querybuildertypesv5LinearBucketsSpecDTO';

export interface Querybuildertypesv5BucketOptionsLinearDTO {
	/**
	 * @type string
	 * @enum linear
	 * @description How the upper bounds are spaced.
	 */
	kind: Querybuildertypesv5BucketOptionsLinearDTOKind;
	/**
	 * @description The evenly spaced bucket specification.
	 */
	spec: Querybuildertypesv5LinearBucketsSpecDTO;
}
