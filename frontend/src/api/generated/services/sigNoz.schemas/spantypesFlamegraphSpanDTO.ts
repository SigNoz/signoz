/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SpantypesEventDTO } from './spantypesEventDTO';
import type { SpantypesFlamegraphSpanDTOAttributes } from './spantypesFlamegraphSpanDTOAttributes';
import type { SpantypesFlamegraphSpanDTOResource } from './spantypesFlamegraphSpanDTOResource';
import type { SpantypesScopeDTO } from './spantypesScopeDTO';

export interface SpantypesFlamegraphSpanDTO {
	/**
	 * @type object
	 */
	attributes: SpantypesFlamegraphSpanDTOAttributes;
	/**
	 * @type integer
	 * @minimum 0
	 */
	durationNano: number;
	/**
	 * @type array
	 */
	event: SpantypesEventDTO[];
	/**
	 * @type boolean
	 */
	hasError: boolean;
	/**
	 * @type integer
	 * @format int64
	 */
	level: number;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type string
	 */
	parentSpanId: string;
	/**
	 * @type object
	 */
	resource: SpantypesFlamegraphSpanDTOResource;
	scope: SpantypesScopeDTO;
	/**
	 * @type string
	 */
	spanId: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	timestamp: number;
}
