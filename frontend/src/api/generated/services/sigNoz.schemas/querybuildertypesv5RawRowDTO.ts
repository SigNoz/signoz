/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5RawRowDTOData } from './querybuildertypesv5RawRowDTOData';

export interface Querybuildertypesv5RawRowDTO {
	/**
	 * @type object,null
	 * @description The selected field values keyed by field name.
	 */
	data?: Querybuildertypesv5RawRowDTOData;
	/**
	 * @type string
	 * @format date-time
	 * @description The record timestamp in RFC 3339 format.
	 */
	timestamp?: string;
}
