/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { PrometheusErrorResponseSchemaDTOErrorType } from './prometheusErrorResponseSchemaDTOErrorType';
import type { PrometheusErrorResponseSchemaDTOStatus } from './prometheusErrorResponseSchemaDTOStatus';

export interface PrometheusErrorResponseSchemaDTO {
	/**
	 * @type string
	 */
	error: string;
	/**
	 * @enum bad_data,execution,canceled,timeout,internal
	 * @type string
	 */
	errorType: PrometheusErrorResponseSchemaDTOErrorType;
	/**
	 * @enum error
	 * @type string
	 */
	status: PrometheusErrorResponseSchemaDTOStatus;
}
