/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { RuletypesEvaluationCumulativeDTO } from './ruletypesEvaluationCumulativeDTO';
import type { RuletypesEvaluationRollingDTO } from './ruletypesEvaluationRollingDTO';

export type RuletypesEvaluationEnvelopeDTO =
	| RuletypesEvaluationRollingDTO
	| RuletypesEvaluationCumulativeDTO;
