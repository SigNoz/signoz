/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesTextAlignDTO } from './dashboardtypesTextAlignDTO';
import type { DashboardtypesVerticalAlignDTO } from './dashboardtypesVerticalAlignDTO';

export interface DashboardtypesTextPresentationDTO {
	/**
	 * @type string,null
	 * @description A hex background color such as #1f2937. Omit for the panel default.
	 */
	background?: string | null;
	/**
	 * @description Horizontal alignment: left (default), center or right.
	 */
	textAlign?: DashboardtypesTextAlignDTO;
	/**
	 * @description Vertical alignment: top (default), center or bottom.
	 */
	verticalAlign?: DashboardtypesVerticalAlignDTO;
}
