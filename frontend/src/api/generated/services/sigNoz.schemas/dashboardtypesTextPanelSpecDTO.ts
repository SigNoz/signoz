/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesHeaderOptionsDTO } from './dashboardtypesHeaderOptionsDTO';
import type { DashboardtypesTextModeDTO } from './dashboardtypesTextModeDTO';
import type { DashboardtypesTextPresentationDTO } from './dashboardtypesTextPresentationDTO';

export interface DashboardtypesTextPanelSpecDTO {
	/**
	 * @description Whether the panel header is shown.
	 */
	headerOptions?: DashboardtypesHeaderOptionsDTO;
	/**
	 * @description How text is interpreted. Only markdown is supported.
	 */
	mode?: DashboardtypesTextModeDTO;
	/**
	 * @description Alignment and background of the content.
	 */
	presentation?: DashboardtypesTextPresentationDTO;
	/**
	 * @type string
	 * @description The content to render.
	 */
	text?: string;
}
