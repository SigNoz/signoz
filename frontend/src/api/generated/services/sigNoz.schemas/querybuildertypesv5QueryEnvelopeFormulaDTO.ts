/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5QueryBuilderFormulaDTO } from './querybuildertypesv5QueryBuilderFormulaDTO';
import type { Querybuildertypesv5QueryEnvelopeFormulaDTOType } from './querybuildertypesv5QueryEnvelopeFormulaDTOType';

export interface Querybuildertypesv5QueryEnvelopeFormulaDTO {
	/**
	 * @description The formula specification.
	 */
	spec?: Querybuildertypesv5QueryBuilderFormulaDTO;
	/**
	 * @type string
	 * @enum builder_formula
	 * @description The type of the query.
	 */
	type: Querybuildertypesv5QueryEnvelopeFormulaDTOType;
}
