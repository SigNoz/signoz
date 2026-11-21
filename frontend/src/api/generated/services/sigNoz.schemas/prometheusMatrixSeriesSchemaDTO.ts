/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { PrometheusMatrixSeriesSchemaDTOMetric } from './prometheusMatrixSeriesSchemaDTOMetric';
import type { PrometheusSamplePairSchemaDTO } from './prometheusSamplePairSchemaDTO';

export interface PrometheusMatrixSeriesSchemaDTO {
	/**
	 * @type object,null
	 */
	metric: PrometheusMatrixSeriesSchemaDTOMetric;
	/**
	 * @type array,null
	 */
	values: (PrometheusSamplePairSchemaDTO | null)[] | null;
}
