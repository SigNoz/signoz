/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesDashboardSpecDTO } from './dashboardtypesDashboardSpecDTO';
import type { TagtypesPostableTagDTO } from './tagtypesPostableTagDTO';

export interface DashboardtypesUpdatableDashboardV2DTO {
	/**
	 * @type string
	 * @description Icon or logo shown in the dashboard list: the path of an icon or logo bundled with the UI under /assets/Icons/ or /assets/Logos/ (only the prefix is validated), or a base64 image data URI for png, jpeg, gif, webp, avif or svg. Empty for none.
	 */
	image?: string;
	/**
	 * @type string
	 * @description The dashboard's current name. The name is immutable, so a different value is rejected.
	 */
	name: string;
	/**
	 * @type string
	 * @pattern ^v6$
	 * @description The dashboard schema version. Must be v6.
	 */
	schemaVersion: string;
	/**
	 * @description The full replacement dashboard content: display, variables, panels, layouts and links.
	 */
	spec: DashboardtypesDashboardSpecDTO;
	/**
	 * @type array,null
	 * @description The full replacement tag set, up to 10 key/value tags, for example key team with value payments. Keys must not be one of the reserved list filter keys: name, description, created_at, updated_at, created_by, locked, source.
	 */
	tags: TagtypesPostableTagDTO[] | null;
}
