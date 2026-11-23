/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { InframonitoringtypesAssociatedComponentDTO } from './inframonitoringtypesAssociatedComponentDTO';

export interface InframonitoringtypesMissingMetricsComponentEntryDTO {
	associatedComponent: InframonitoringtypesAssociatedComponentDTO;
	/**
	 * @type string
	 */
	documentationLink: string;
	/**
	 * @type string
	 */
	message: string;
	/**
	 * @type array,null
	 */
	metrics: string[] | null;
}
