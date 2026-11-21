/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SpantypesThreadSpanDTO } from './spantypesThreadSpanDTO';

export interface SpantypesGettableTraceThreadDTO {
	/**
	 * @type string
	 */
	nextCursor?: string;
	/**
	 * @type string
	 */
	prevCursor?: string;
	/**
	 * @type array
	 */
	spans: SpantypesThreadSpanDTO[];
}
