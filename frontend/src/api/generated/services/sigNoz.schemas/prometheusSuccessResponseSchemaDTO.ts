/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { PrometheusQueryDataSchemaDTO } from './prometheusQueryDataSchemaDTO';
import type { PrometheusSuccessResponseSchemaDTOStatus } from './prometheusSuccessResponseSchemaDTOStatus';

export interface PrometheusSuccessResponseSchemaDTO {
	data: PrometheusQueryDataSchemaDTO;
	/**
	 * @type array
	 */
	infos?: string[];
	/**
	 * @enum success
	 * @type string
	 */
	status: PrometheusSuccessResponseSchemaDTOStatus;
	/**
	 * @type array
	 */
	warnings?: string[];
}
