/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SpantypesEventDTOAttributeMap } from './spantypesEventDTOAttributeMap';

export interface SpantypesEventDTO {
	/**
	 * @type object
	 */
	attributeMap?: SpantypesEventDTOAttributeMap;
	/**
	 * @type boolean
	 */
	isError?: boolean;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	timeUnixNano?: number;
}
