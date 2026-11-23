/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SavedviewtypesSavedViewSpecDTO } from './savedviewtypesSavedViewSpecDTO';
import type { SavedviewtypesSchemaVersionDTO } from './savedviewtypesSchemaVersionDTO';
import type { SavedviewtypesSourceDTO } from './savedviewtypesSourceDTO';

export interface SavedviewtypesUpdatableSavedViewDTO {
	/**
	 * @description The version of the spec shape. The only accepted value is v2.
	 */
	schemaVersion: SavedviewtypesSchemaVersionDTO;
	/**
	 * @description The explorer page the view belongs to: traces, logs, metrics, meter or ai_observability. The machine name cannot be changed; it is identified by the id in the path.
	 */
	source: SavedviewtypesSourceDTO;
	/**
	 * @description The full replacement spec. Fields left out are reset, not preserved.
	 */
	spec: SavedviewtypesSavedViewSpecDTO;
}
