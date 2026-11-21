/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export type GetTraceThreadParams = {
	/**
	 * @type integer
	 * @description Page size, at most 100. 0 means 20.
	 */
	limit?: number;
	/**
	 * @type string
	 * @description The nextCursor of a page; returns the spans after it. Set only one of after, before and spanId.
	 */
	after?: string;
	/**
	 * @type string
	 * @description The prevCursor of a page; returns the spans before it. Set only one of after, before and spanId.
	 */
	before?: string;
	/**
	 * @type string
	 * @description Returns the page around this span. Set only one of after, before and spanId.
	 */
	spanId?: string;
};
