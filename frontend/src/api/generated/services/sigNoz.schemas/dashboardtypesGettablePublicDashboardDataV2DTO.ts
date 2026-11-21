/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesGettableDashboardV2DTO } from './dashboardtypesGettableDashboardV2DTO';
import type { DashboardtypesGettablePublicDasbhboardDTO } from './dashboardtypesGettablePublicDasbhboardDTO';

export interface DashboardtypesGettablePublicDashboardDataV2DTO {
	/**
	 * @description The dashboard with panel and variable queries redacted.
	 */
	dashboard?: DashboardtypesGettableDashboardV2DTO;
	/**
	 * @description The sharing settings.
	 */
	publicDashboard?: DashboardtypesGettablePublicDasbhboardDTO;
}
