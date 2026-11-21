/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SpantypesFieldContextDTO } from './spantypesFieldContextDTO';
import type { SpantypesSpanMapperOperationDTO } from './spantypesSpanMapperOperationDTO';
import type { SpantypesSpanMapperOriginDTO } from './spantypesSpanMapperOriginDTO';

export interface SpantypesSpanMapperSourceDTO {
	context: SpantypesFieldContextDTO;
	/**
	 * @type boolean
	 */
	enabled: boolean;
	/**
	 * @type string
	 */
	key: string;
	operation: SpantypesSpanMapperOperationDTO;
	origin?: SpantypesSpanMapperOriginDTO;
	/**
	 * @type integer
	 */
	priority: number;
}
