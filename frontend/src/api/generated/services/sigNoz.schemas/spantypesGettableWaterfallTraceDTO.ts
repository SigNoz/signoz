/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { SpantypesWaterfallSpanDTO } from './spantypesWaterfallSpanDTO';

export interface SpantypesGettableWaterfallTraceDTO {
	/**
	 * @type integer
	 * @minimum 0
	 */
	endTimestampMillis?: number;
	/**
	 * @type boolean
	 */
	hasMissingSpans?: boolean;
	/**
	 * @type boolean
	 */
	hasMore?: boolean;
	/**
	 * @type string
	 */
	rootServiceEntryPoint?: string;
	/**
	 * @type string
	 */
	rootServiceName?: string;
	/**
	 * @type array,null
	 */
	spans?: SpantypesWaterfallSpanDTO[] | null;
	/**
	 * @type integer
	 * @minimum 0
	 */
	startTimestampMillis?: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	totalErrorSpansCount?: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	totalSpansCount?: number;
	/**
	 * @type array,null
	 */
	uncollapsedSpans?: string[] | null;
}
