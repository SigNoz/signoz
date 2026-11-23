/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5PromQueryDTO } from './querybuildertypesv5PromQueryDTO';
import type { Querybuildertypesv5QueryEnvelopePromQLDTOType } from './querybuildertypesv5QueryEnvelopePromQLDTOType';

export interface Querybuildertypesv5QueryEnvelopePromQLDTO {
	/**
	 * @description The PromQL query specification.
	 */
	spec?: Querybuildertypesv5PromQueryDTO;
	/**
	 * @type string
	 * @enum promql
	 * @description The type of the query.
	 */
	type: Querybuildertypesv5QueryEnvelopePromQLDTOType;
}
