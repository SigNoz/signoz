/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5QueryBuilderTraceOperatorDTO } from './querybuildertypesv5QueryBuilderTraceOperatorDTO';
import type { Querybuildertypesv5QueryEnvelopeTraceOperatorDTOType } from './querybuildertypesv5QueryEnvelopeTraceOperatorDTOType';

export interface Querybuildertypesv5QueryEnvelopeTraceOperatorDTO {
	/**
	 * @description The trace operator specification.
	 */
	spec?: Querybuildertypesv5QueryBuilderTraceOperatorDTO;
	/**
	 * @type string
	 * @enum builder_trace_operator
	 * @description The type of the query.
	 */
	type: Querybuildertypesv5QueryEnvelopeTraceOperatorDTOType;
}
