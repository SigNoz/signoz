/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SpantypesFieldContextDTO } from './spantypesFieldContextDTO';
import type { SpantypesSpanMapperConfigDTO } from './spantypesSpanMapperConfigDTO';

export interface SpantypesPostableSpanMapperDTO {
	config: SpantypesSpanMapperConfigDTO;
	/**
	 * @type boolean
	 */
	enabled?: boolean;
	fieldContext: SpantypesFieldContextDTO;
	/**
	 * @type string
	 */
	name: string;
}
