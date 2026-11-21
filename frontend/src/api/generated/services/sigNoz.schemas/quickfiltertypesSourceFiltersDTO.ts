/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { QuickfiltertypesSourceDTO } from './quickfiltertypesSourceDTO';
import type { TelemetrytypesTelemetryFieldKeyDTO } from './telemetrytypesTelemetryFieldKeyDTO';

export interface QuickfiltertypesSourceFiltersDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type array
	 */
	filters: TelemetrytypesTelemetryFieldKeyDTO[];
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	orgId: string;
	source: QuickfiltertypesSourceDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
}
