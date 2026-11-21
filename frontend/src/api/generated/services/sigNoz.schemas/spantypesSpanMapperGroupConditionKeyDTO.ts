/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SpantypesSpanMapperOriginDTO } from './spantypesSpanMapperOriginDTO';

export interface SpantypesSpanMapperGroupConditionKeyDTO {
	/**
	 * @type boolean
	 */
	enabled: boolean;
	origin?: SpantypesSpanMapperOriginDTO;
	/**
	 * @type string
	 */
	value: string;
}
