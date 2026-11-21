/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5QueryEnvelopeDTO } from './querybuildertypesv5QueryEnvelopeDTO';

/**
 * Composite query containing one or more query envelopes. Each query envelope specifies its type and corresponding spec.
 */
export interface Querybuildertypesv5CompositeQueryDTO {
	/**
	 * @type array,null
	 * @description The queries to run, each wrapped in a type-discriminated envelope. Names must be unique; formulas and trace operators reference other queries by name.
	 */
	queries?: Querybuildertypesv5QueryEnvelopeDTO[] | null;
}
