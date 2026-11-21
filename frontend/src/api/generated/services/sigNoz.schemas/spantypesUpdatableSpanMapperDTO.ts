/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SpantypesFieldContextDTO } from './spantypesFieldContextDTO';
import type { SpantypesSpanMapperConfigDTO } from './spantypesSpanMapperConfigDTO';

export interface SpantypesUpdatableSpanMapperDTO {
	config?: SpantypesSpanMapperConfigDTO;
	/**
	 * @type boolean,null
	 */
	enabled?: boolean | null;
	fieldContext?: SpantypesFieldContextDTO;
}
