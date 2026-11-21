/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesLegendDTOCustomColors } from './dashboardtypesLegendDTOCustomColors';
import type { DashboardtypesLegendModeDTO } from './dashboardtypesLegendModeDTO';
import type { DashboardtypesLegendPositionDTO } from './dashboardtypesLegendPositionDTO';

export interface DashboardtypesLegendDTO {
	/**
	 * @type object,null
	 * @description Hex colors keyed by series label, overriding the automatic palette.
	 */
	customColors?: DashboardtypesLegendDTOCustomColors;
	/**
	 * @description The legend layout. Only list is supported.
	 */
	mode?: DashboardtypesLegendModeDTO;
	/**
	 * @description Where the legend sits: bottom (default) or right.
	 */
	position?: DashboardtypesLegendPositionDTO;
}
