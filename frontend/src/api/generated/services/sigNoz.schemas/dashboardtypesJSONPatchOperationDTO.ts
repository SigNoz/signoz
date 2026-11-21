/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesPatchOpDTO } from './dashboardtypesPatchOpDTO';

export interface DashboardtypesJSONPatchOperationDTO {
	/**
	 * @type string
	 * @description Source JSON Pointer for move/copy ops; ignored for other ops.
	 */
	from?: string;
	/**
	 * @description The RFC 6902 verb: add, remove, replace, move, copy or test. remove on a missing path is a no-op and add creates missing parents.
	 */
	op: DashboardtypesPatchOpDTO;
	/**
	 * @type string
	 * @description JSON Pointer (RFC 6901) into the dashboard's postable shape — e.g. /spec/display/name, /spec/panels/<id>, /spec/panels/<id>/spec/queries/0, /tags/-.
	 */
	path: string;
	/**
	 * @description Value to add/replace/test against. The expected type depends on the path. Common shapes (see referenced schemas for the exact field set): /spec/panels/<id> takes a DashboardtypesPanel; /spec/panels/<id>/spec/queries/N (or /-) takes a DashboardtypesQuery; /spec/variables/N takes a DashboardtypesVariable; /spec/layouts/N takes a DashboardtypesLayout; /tags/N (or /-) takes a TagtypesPostableTag; /spec/display/name and other leaf string fields take a string. Required for add/replace/test; ignored for remove/move/copy.
	 */
	value?: unknown;
}
