/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SavedviewtypesSourceDTO } from './savedviewtypesSourceDTO';

export type ListSavedViewsParams = {
	/**
	 * @description Returns only the views of this explorer page: traces, logs, metrics, meter or ai_observability. Defaults to every source.
	 */
	source?: SavedviewtypesSourceDTO;
	/**
	 * @type string
	 * @description Returns only the view with this exact machine name.
	 */
	name?: string;
};
