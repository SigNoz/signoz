/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesListedDashboardV2SpecDTO } from './dashboardtypesListedDashboardV2SpecDTO';
import type { DashboardtypesSourceDTO } from './dashboardtypesSourceDTO';
import type { TagtypesGettableTagDTO } from './tagtypesGettableTagDTO';

export interface DashboardtypesListedDashboardV2DTO {
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
	 * @description Icon or logo shown in the dashboard list: the path of an icon or logo bundled with the UI under /assets/Icons/ or /assets/Logos/, or a base64 image data URI. Omitted when none is set.
	 */
	image?: string;
	/**
	 * @type boolean
	 * @description Whether the dashboard is still in the v1 schema. It is listed but cannot be fetched or edited through the v2 endpoints.
	 */
	legacy: boolean;
	/**
	 * @type boolean
	 * @description Whether the dashboard is locked against update and patch.
	 */
	locked: boolean;
	/**
	 * @type string
	 * @description The dashboard's unique, immutable name.
	 */
	name: string;
	/**
	 * @type string
	 * @description The organization that owns the dashboard.
	 */
	orgId: string;
	/**
	 * @type string
	 * @description The dashboard schema version, v6 for v2 dashboards.
	 */
	schemaVersion: string;
	/**
	 * @description Where the dashboard came from: user or integration. System dashboards are not listed.
	 */
	source: DashboardtypesSourceDTO;
	/**
	 * @description The display part of the dashboard spec. Panels, variables and layouts are not included in list rows.
	 */
	spec: DashboardtypesListedDashboardV2SpecDTO;
	/**
	 * @type array
	 * @description The tags attached to the dashboard.
	 */
	tags: TagtypesGettableTagDTO[];
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
