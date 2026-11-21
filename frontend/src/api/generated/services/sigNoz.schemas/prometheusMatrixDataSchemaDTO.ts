/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { PrometheusMatrixDataSchemaDTOResultType } from './prometheusMatrixDataSchemaDTOResultType';
import type { PrometheusMatrixSeriesSchemaDTO } from './prometheusMatrixSeriesSchemaDTO';

export interface PrometheusMatrixDataSchemaDTO {
	/**
	 * @type array,null
	 */
	result: PrometheusMatrixSeriesSchemaDTO[] | null;
	/**
	 * @enum matrix
	 * @type string
	 */
	resultType: PrometheusMatrixDataSchemaDTOResultType;
}
