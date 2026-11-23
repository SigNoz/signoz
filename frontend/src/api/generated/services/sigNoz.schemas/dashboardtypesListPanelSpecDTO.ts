/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { TelemetrytypesTelemetryFieldKeyDTO } from './telemetrytypesTelemetryFieldKeyDTO';

export interface DashboardtypesListPanelSpecDTO {
	/**
	 * @type array,null
	 * @description The columns shown for each row, as field keys with name and optional fieldContext, fieldDataType and signal. Empty shows the default columns.
	 */
	selectFields?: TelemetrytypesTelemetryFieldKeyDTO[] | null;
}
