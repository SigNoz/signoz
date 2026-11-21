/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { PrometheusSamplePairSchemaDTO } from './prometheusSamplePairSchemaDTO';
import type { PrometheusVectorSampleSchemaDTOMetric } from './prometheusVectorSampleSchemaDTOMetric';

export interface PrometheusVectorSampleSchemaDTO {
	/**
	 * @type object,null
	 */
	metric: PrometheusVectorSampleSchemaDTOMetric;
	value: PrometheusSamplePairSchemaDTO | null;
}
