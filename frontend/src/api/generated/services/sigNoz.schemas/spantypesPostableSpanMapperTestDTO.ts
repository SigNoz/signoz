/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SpantypesPostableSpanMapperTestGroupDTO } from './spantypesPostableSpanMapperTestGroupDTO';
import type { SpantypesSpanMapperTestSpanDTO } from './spantypesSpanMapperTestSpanDTO';

export interface SpantypesPostableSpanMapperTestDTO {
	/**
	 * @type array,null
	 */
	groups: SpantypesPostableSpanMapperTestGroupDTO[] | null;
	/**
	 * @type array,null
	 */
	spans: SpantypesSpanMapperTestSpanDTO[] | null;
}
