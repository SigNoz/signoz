export interface TraceTokenUsage {
	input: number;
	output: number;
	cacheRead?: number;
	cacheWrite?: number;
	reasoning?: number;
}

/** Response of GET /api/v1/traces/{id}/summary. */
export interface TraceSummary {
	startTimestampMillis: number;
	endTimestampMillis: number;
	rootServiceName: string;
	rootServiceEntryPoint: string;
	totalSpansCount: number;
	totalErrorSpansCount: number;
	hasMissingSpans: boolean;
	ai?: {
		tokens?: TraceTokenUsage;
		// null when no span has a cost attribute
		totalCost: number | null;
	};
}
