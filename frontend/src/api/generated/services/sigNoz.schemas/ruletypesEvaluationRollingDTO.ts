/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { RuletypesEvaluationRollingDTOKind } from './ruletypesEvaluationRollingDTOKind';
import type { RuletypesRollingWindowDTO } from './ruletypesRollingWindowDTO';

export interface RuletypesEvaluationRollingDTO {
	/**
	 * @type string
	 * @enum rolling
	 * @description The kind of evaluation.
	 */
	kind: RuletypesEvaluationRollingDTOKind;
	/**
	 * @description The rolling window evaluation specification.
	 */
	spec: RuletypesRollingWindowDTO;
}
