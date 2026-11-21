/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5BucketOptionsLogDTOKind } from './querybuildertypesv5BucketOptionsLogDTOKind';
import type { Querybuildertypesv5LogBucketsSpecDTO } from './querybuildertypesv5LogBucketsSpecDTO';

export interface Querybuildertypesv5BucketOptionsLogDTO {
	/**
	 * @type string
	 * @enum log
	 * @description How the upper bounds are spaced.
	 */
	kind: Querybuildertypesv5BucketOptionsLogDTOKind;
	/**
	 * @description The logarithmic bucket specification.
	 */
	spec: Querybuildertypesv5LogBucketsSpecDTO;
}
