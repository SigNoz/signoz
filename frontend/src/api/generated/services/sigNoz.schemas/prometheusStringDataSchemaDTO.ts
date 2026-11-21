/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { PrometheusSamplePairSchemaDTO } from './prometheusSamplePairSchemaDTO';
import type { PrometheusStringDataSchemaDTOResultType } from './prometheusStringDataSchemaDTOResultType';

export interface PrometheusStringDataSchemaDTO {
	result: PrometheusSamplePairSchemaDTO | null;
	/**
	 * @enum string
	 * @type string
	 */
	resultType: PrometheusStringDataSchemaDTOResultType;
}
