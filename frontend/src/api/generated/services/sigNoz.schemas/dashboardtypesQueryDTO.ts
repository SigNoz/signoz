/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesQuerySpecDTO } from './dashboardtypesQuerySpecDTO';
import type { Querybuildertypesv5RequestTypeDTO } from './querybuildertypesv5RequestTypeDTO';

export interface DashboardtypesQueryDTO {
	/**
	 * @description The result shape the panel requests: time_series for time series, bar, area and histogram panels, scalar for number, table and pie panels, raw for list panels, heatmap for heatmap panels, trace for trace panels.
	 */
	kind: Querybuildertypesv5RequestTypeDTO;
	/**
	 * @description The query content: an optional name and the query plugin.
	 */
	spec: DashboardtypesQuerySpecDTO;
}
