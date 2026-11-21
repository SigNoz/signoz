/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SavedviewtypesSavedViewSpecDTO } from './savedviewtypesSavedViewSpecDTO';
import type { SavedviewtypesSchemaVersionDTO } from './savedviewtypesSchemaVersionDTO';
import type { SavedviewtypesSourceDTO } from './savedviewtypesSourceDTO';

export interface SavedviewtypesSavedViewDTO {
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
	 * @description The machine name of the view, a DNS-1123 label unique within the organization. Immutable after creation.
	 */
	name?: string;
	/**
	 * @description The version of the spec shape. The only accepted value is v2.
	 */
	schemaVersion: SavedviewtypesSchemaVersionDTO;
	/**
	 * @description The explorer page the view belongs to: traces, logs, metrics, meter or ai_observability.
	 */
	source?: SavedviewtypesSourceDTO;
	/**
	 * @description The display name, panel type, request type, queries and column selection of the view.
	 */
	spec: SavedviewtypesSavedViewSpecDTO;
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
