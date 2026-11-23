/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesDashboardSpecDTOPanels } from './dashboardtypesDashboardSpecDTOPanels';
import type { DashboardtypesDisplayDTO } from './dashboardtypesDisplayDTO';
import type { DashboardtypesLayoutDTO } from './dashboardtypesLayoutDTO';
import type { DashboardtypesLinkDTO } from './dashboardtypesLinkDTO';
import type { DashboardtypesVariableDTO } from './dashboardtypesVariableDTO';

export interface DashboardtypesDashboardSpecDTO {
	/**
	 * @description The dashboard title and description.
	 */
	display: DashboardtypesDisplayDTO;
	/**
	 * @type string
	 * @description The default time range, as a Prometheus duration such as 1h or 7d. The UI opens the dashboard on it, rounded up to whole minutes, when neither the URL nor the viewer's last pick sets a time range.
	 */
	duration?: string;
	/**
	 * @type array
	 * @description The Grid layouts that place panels, at most 500. Each panel can be placed at most once. Use [] for none.
	 */
	layouts: DashboardtypesLayoutDTO[];
	/**
	 * @type array,null
	 * @description External links stored with the dashboard. Not shown by the UI.
	 */
	links?: DashboardtypesLinkDTO[] | null;
	/**
	 * @type object
	 * @description The panels keyed by panel id. An id has up to 75 characters from letters, digits, dot, underscore and hyphen. A panel is shown only where a layout item references it as #/spec/panels/<id>. Use {} for none.
	 */
	panels: DashboardtypesDashboardSpecDTOPanels;
	/**
	 * @type string
	 * @description The auto refresh interval, as a Prometheus duration such as 30s. Stored, but not applied by the UI.
	 */
	refreshInterval?: string;
	/**
	 * @type array
	 * @description The dashboard variables, each a ListVariable or TextVariable envelope, referenced in queries as $name. Names must be unique. Use [] for none.
	 */
	variables: DashboardtypesVariableDTO[];
}
