/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { PrometheusVectorDataSchemaDTOResultType } from './prometheusVectorDataSchemaDTOResultType';
import type { PrometheusVectorSampleSchemaDTO } from './prometheusVectorSampleSchemaDTO';

export interface PrometheusVectorDataSchemaDTO {
	/**
	 * @type array,null
	 */
	result: PrometheusVectorSampleSchemaDTO[] | null;
	/**
	 * @enum vector
	 * @type string
	 */
	resultType: PrometheusVectorDataSchemaDTOResultType;
}
