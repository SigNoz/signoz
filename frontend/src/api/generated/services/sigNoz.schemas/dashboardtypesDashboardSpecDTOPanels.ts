/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesPanelDTO } from './dashboardtypesPanelDTO';

/**
 * The panels keyed by panel id. An id has up to 75 characters from letters, digits, dot, underscore and hyphen. A panel is shown only where a layout item references it as #/spec/panels/<id>. Use {} for none.
 */
export type DashboardtypesDashboardSpecDTOPanels = {
	[key: string]: DashboardtypesPanelDTO;
};
