/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { PrometheusSamplePairSchemaDTOItem } from './prometheusSamplePairSchemaDTOItem';

/**
 * A [timestamp, value] pair: float unix seconds, then the string-encoded sample value ("NaN", "+Inf", "-Inf" included).
 * @minItems 2
 * @maxItems 2
 * @nullable
 */
export type PrometheusSamplePairSchemaDTO =
	| PrometheusSamplePairSchemaDTOItem[]
	| null;
