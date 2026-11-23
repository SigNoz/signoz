/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesBasicVisualizationDTO } from './dashboardtypesBasicVisualizationDTO';
import type { DashboardtypesTableFormattingDTO } from './dashboardtypesTableFormattingDTO';
import type { DashboardtypesTableThresholdDTO } from './dashboardtypesTableThresholdDTO';

export interface DashboardtypesTablePanelSpecDTO {
	/**
	 * @description Per-column units and decimal precision.
	 */
	formatting?: DashboardtypesTableFormattingDTO;
	/**
	 * @type array,null
	 * @description Rules that recolor a cell when its column value compares to a threshold as specified.
	 */
	thresholds?: DashboardtypesTableThresholdDTO[] | null;
	/**
	 * @description The time range the rows are computed over.
	 */
	visualization?: DashboardtypesBasicVisualizationDTO;
}
