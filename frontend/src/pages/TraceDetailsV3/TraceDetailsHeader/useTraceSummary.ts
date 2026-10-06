import { MOCK_TRACE_SUMMARY } from './mockTraceSummary';
import { TraceSummary } from './types';

interface UseTraceSummaryResult {
	data: TraceSummary | undefined;
	isLoading: boolean;
}

// Placeholder until GET /api/v1/traces/{id}/summary is available.
export function useTraceSummary(): UseTraceSummaryResult {
	return { data: MOCK_TRACE_SUMMARY, isLoading: false };
}
