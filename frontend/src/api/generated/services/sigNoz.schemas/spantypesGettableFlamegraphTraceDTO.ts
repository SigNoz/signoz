/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SpantypesFlamegraphSpanDTO } from './spantypesFlamegraphSpanDTO';

export interface SpantypesGettableFlamegraphTraceDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	endTimestampMillis: number;
	/**
	 * @type boolean
	 */
	hasMore: boolean;
	/**
	 * @type array
	 */
	spans: SpantypesFlamegraphSpanDTO[][];
	/**
	 * @type integer
	 * @format int64
	 */
	startTimestampMillis: number;
}
