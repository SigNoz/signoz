/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5QueryWarnDataAdditionalDTO } from './querybuildertypesv5QueryWarnDataAdditionalDTO';

export interface Querybuildertypesv5QueryWarnDataDTO {
	/**
	 * @type string
	 * @description A summary of the warnings raised while executing the request.
	 */
	message?: string;
	/**
	 * @type string
	 * @description A documentation link explaining the warnings.
	 */
	url?: string;
	/**
	 * @type array
	 * @description The individual warnings.
	 */
	warnings?: Querybuildertypesv5QueryWarnDataAdditionalDTO[];
}
