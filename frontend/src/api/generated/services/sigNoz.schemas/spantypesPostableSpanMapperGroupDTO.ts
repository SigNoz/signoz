/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SpantypesSpanMapperGroupConditionDTO } from './spantypesSpanMapperGroupConditionDTO';

export interface SpantypesPostableSpanMapperGroupDTO {
	condition: SpantypesSpanMapperGroupConditionDTO | null;
	/**
	 * @type boolean
	 */
	enabled?: boolean;
	/**
	 * @type string
	 */
	name: string;
}
