/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesDashboardSpecDTO } from './dashboardtypesDashboardSpecDTO';
import type { DashboardtypesSourceDTO } from './dashboardtypesSourceDTO';
import type { TagtypesGettableTagDTO } from './tagtypesGettableTagDTO';

export interface DashboardtypesGettableDashboardV2DTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type string
	 */
	createdBy?: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 * @description Icon or logo shown in the dashboard list: the path of an icon or logo bundled with the UI under /assets/Icons/ or /assets/Logos/ (only the prefix is validated), or a base64 image data URI for png, jpeg, gif, webp, avif or svg. Empty for none.
	 */
	image?: string;
	/**
	 * @type boolean
	 * @description Whether the dashboard is locked. A locked dashboard rejects update and patch until it is unlocked.
	 */
	locked: boolean;
	/**
	 * @type string
	 * @description The dashboard's unique, immutable name, a DNS-1123 label.
	 */
	name: string;
	/**
	 * @type string
	 * @description The organization that owns the dashboard.
	 */
	orgId: string;
	/**
	 * @type string
	 * @pattern ^v6$
	 * @description The dashboard schema version. Must be v6.
	 */
	schemaVersion: string;
	/**
	 * @description Where the dashboard came from: user, integration or system. Only user dashboards can be modified.
	 */
	source: DashboardtypesSourceDTO;
	/**
	 * @description The dashboard content: display, variables, panels, layouts and links.
	 */
	spec: DashboardtypesDashboardSpecDTO;
	/**
	 * @type array,null
	 * @description The key/value tags attached to the dashboard, for example key team with value payments.
	 */
	tags: TagtypesGettableTagDTO[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
	/**
	 * @type string
	 */
	updatedBy?: string;
}
