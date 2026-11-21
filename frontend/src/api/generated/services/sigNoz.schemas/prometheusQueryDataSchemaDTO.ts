/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { PrometheusMatrixDataSchemaDTO } from './prometheusMatrixDataSchemaDTO';
import type { PrometheusScalarDataSchemaDTO } from './prometheusScalarDataSchemaDTO';
import type { PrometheusStringDataSchemaDTO } from './prometheusStringDataSchemaDTO';
import type { PrometheusVectorDataSchemaDTO } from './prometheusVectorDataSchemaDTO';

export type PrometheusQueryDataSchemaDTO =
	| PrometheusMatrixDataSchemaDTO
	| PrometheusVectorDataSchemaDTO
	| PrometheusScalarDataSchemaDTO
	| PrometheusStringDataSchemaDTO;
