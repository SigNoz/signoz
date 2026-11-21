/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SpantypesFieldContextDTO } from './spantypesFieldContextDTO';
import type { SpantypesSpanMapperConfigDTO } from './spantypesSpanMapperConfigDTO';
import type { SpantypesSpanMapperOriginDTO } from './spantypesSpanMapperOriginDTO';

export interface SpantypesSpanMapperDTO {
	config: SpantypesSpanMapperConfigDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type string
	 */
	createdBy?: string;
	/**
	 * @type boolean
	 */
	enabled: boolean;
	fieldContext: SpantypesFieldContextDTO;
	/**
	 * @type string
	 */
	groupId: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	name: string;
	origin: SpantypesSpanMapperOriginDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
	/**
	 * @type string
	 */
	updatedBy?: string;
}
