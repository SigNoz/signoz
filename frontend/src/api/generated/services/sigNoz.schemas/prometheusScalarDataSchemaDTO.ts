/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { PrometheusSamplePairSchemaDTO } from './prometheusSamplePairSchemaDTO';
import type { PrometheusScalarDataSchemaDTOResultType } from './prometheusScalarDataSchemaDTOResultType';

export interface PrometheusScalarDataSchemaDTO {
	result: PrometheusSamplePairSchemaDTO | null;
	/**
	 * @enum scalar
	 * @type string
	 */
	resultType: PrometheusScalarDataSchemaDTOResultType;
}
