/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SpantypesPostableSpanMapperDTO } from './spantypesPostableSpanMapperDTO';
import type { SpantypesSpanMapperGroupConditionDTO } from './spantypesSpanMapperGroupConditionDTO';

export interface SpantypesPostableSpanMapperTestGroupDTO {
	condition: SpantypesSpanMapperGroupConditionDTO | null;
	/**
	 * @type boolean
	 */
	enabled?: boolean;
	/**
	 * @type array,null
	 */
	mappers?: SpantypesPostableSpanMapperDTO[] | null;
	/**
	 * @type string
	 */
	name: string;
}
