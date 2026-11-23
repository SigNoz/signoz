/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SavedviewtypesSavedViewSpecDTO } from './savedviewtypesSavedViewSpecDTO';
import type { SavedviewtypesSchemaVersionDTO } from './savedviewtypesSchemaVersionDTO';
import type { SavedviewtypesSourceDTO } from './savedviewtypesSourceDTO';

export interface SavedviewtypesPostableSavedViewDTO {
	/**
	 * @type boolean
	 * @description When true the server derives name from spec.displayName and appends a random suffix. Defaults to false.
	 */
	generateName?: boolean;
	/**
	 * @type string
	 * @description The machine name of the view, a DNS-1123 label (lowercase letters, digits and hyphens, at most 63 characters) unique within the organization. Required unless generateName is true, in which case it must be empty.
	 */
	name?: string;
	/**
	 * @description The version of the spec shape. The only accepted value is v2.
	 */
	schemaVersion: SavedviewtypesSchemaVersionDTO;
	/**
	 * @description The explorer page the view belongs to: traces, logs, metrics, meter or ai_observability. Builder queries inside spec must use the matching signal; meter views use signal metrics with source meter.
	 */
	source: SavedviewtypesSourceDTO;
	/**
	 * @description The display name, panel type, request type, queries and column selection of the view.
	 */
	spec: SavedviewtypesSavedViewSpecDTO;
}
