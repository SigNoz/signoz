/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { RuletypesCumulativeWindowDTO } from './ruletypesCumulativeWindowDTO';
import type { RuletypesEvaluationCumulativeDTOKind } from './ruletypesEvaluationCumulativeDTOKind';

export interface RuletypesEvaluationCumulativeDTO {
	/**
	 * @type string
	 * @enum cumulative
	 * @description The kind of evaluation.
	 */
	kind: RuletypesEvaluationCumulativeDTOKind;
	/**
	 * @description The cumulative window evaluation specification.
	 */
	spec: RuletypesCumulativeWindowDTO;
}
