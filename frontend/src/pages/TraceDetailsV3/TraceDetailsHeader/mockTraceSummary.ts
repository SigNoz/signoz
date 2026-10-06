import { TraceSummary } from './types';

// Placeholder until GET /api/v1/traces/{id}/summary feeds the header.
export const MOCK_TRACE_SUMMARY: TraceSummary = {
	startTimestampMillis: 1789627365929,
	endTimestampMillis: 1789627367867,
	rootServiceName: '',
	rootServiceEntryPoint: 'Missing Span',
	totalSpansCount: 3,
	totalErrorSpansCount: 0,
	hasMissingSpans: true,
	ai: {
		tokens: {
			input: 12040,
			output: 3110,
			cacheRead: 8000,
			cacheWrite: 1200,
			reasoning: 900,
		},
		totalCost: 0.0421,
	},
};
