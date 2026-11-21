/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesDashboardSpecDTO } from './dashboardtypesDashboardSpecDTO';
import type { TagtypesPostableTagDTO } from './tagtypesPostableTagDTO';

export interface DashboardtypesPostableDashboardV2DTO {
	/**
	 * @type boolean
	 * @description When true the server derives name from spec.display.name plus a random suffix. Requires an empty name and a non-empty spec.display.name.
	 */
	generateName?: boolean;
	/**
	 * @type string
	 * @description Icon or logo shown in the dashboard list: the path of an icon or logo bundled with the UI under /assets/Icons/ or /assets/Logos/ (only the prefix is validated), or a base64 image data URI for png, jpeg, gif, webp, avif or svg. Empty for none.
	 */
	image?: string;
	/**
	 * @type string
	 * @description The dashboard's unique name, a DNS-1123 label (lowercase letters, digits and hyphens, at most 63 characters). Immutable after creation. Must be empty when generateName is true.
	 */
	name?: string;
	/**
	 * @type string
	 * @pattern ^v6$
	 * @description The dashboard schema version. Must be v6.
	 */
	schemaVersion: string;
	/**
	 * @description The dashboard content: display, variables, panels, layouts and links.
	 */
	spec: DashboardtypesDashboardSpecDTO;
	/**
	 * @type array,null
	 * @description Up to 10 key/value tags, for example key team with value payments. Keys must not be one of the reserved list filter keys: name, description, created_at, updated_at, created_by, locked, source. Use [] for none.
	 */
	tags: TagtypesPostableTagDTO[] | null;
}
