/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5BuilderQuerySpecDTO } from './querybuildertypesv5BuilderQuerySpecDTO';
import type { Querybuildertypesv5QueryEnvelopeBuilderDTOType } from './querybuildertypesv5QueryEnvelopeBuilderDTOType';

export interface Querybuildertypesv5QueryEnvelopeBuilderDTO {
	/**
	 * @description The builder query specification.
	 */
	spec?: Querybuildertypesv5BuilderQuerySpecDTO;
	/**
	 * @type string
	 * @enum builder_query
	 * @description The type of the query.
	 */
	type: Querybuildertypesv5QueryEnvelopeBuilderDTOType;
}
