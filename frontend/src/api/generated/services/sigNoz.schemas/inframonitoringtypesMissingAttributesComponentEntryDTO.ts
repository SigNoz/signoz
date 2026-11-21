/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { InframonitoringtypesAssociatedComponentDTO } from './inframonitoringtypesAssociatedComponentDTO';

export interface InframonitoringtypesMissingAttributesComponentEntryDTO {
	associatedComponent: InframonitoringtypesAssociatedComponentDTO;
	/**
	 * @type array,null
	 */
	attributes: string[] | null;
	/**
	 * @type string
	 */
	documentationLink: string;
	/**
	 * @type string
	 */
	message: string;
}
