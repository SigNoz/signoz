import type {
	SpantypesGettableTraceSummaryDTO,
	SpantypesThreadSpanDTO,
} from 'api/generated/services/sigNoz.schemas';
import { isAxiosError } from 'axios';

import { collectToolCallKeys } from '../AIThreadMessage/utils';
import { TraceDetailsTab } from '../constants';
import { TraceDetailEventKeys } from '../events';
import { SpanDetailVariant } from '../SpanDetailsPanel/constants';
import { InterestedSpanStatus, ThreadSpan } from './types';

/** Derives SpanV3's `timestamp` and `service.name`, as the waterfall does. */
export function toThreadSpan(span: SpantypesThreadSpanDTO): ThreadSpan {
	return {
		...(span as unknown as ThreadSpan),
		'service.name': span.resource?.['service.name'] || '',
		timestamp: span.time_unix,
	};
}

export function isNotFoundError(error: unknown): boolean {
	return isAxiosError(error) && error.response?.status === 404;
}

export function buildToolCallIndex(span: ThreadSpan): Set<string> {
	return new Set([
		...collectToolCallKeys(span.formattedInput ?? []),
		...collectToolCallKeys(span.formattedOutput ?? []),
	]);
}

export function getInterestedSpanStatus(
	interestedSpanId: string | undefined,
	spans: ThreadSpan[],
	isLoading: boolean,
	isNotFound: boolean,
): InterestedSpanStatus {
	if (!interestedSpanId) {
		return InterestedSpanStatus.None;
	}
	if (isLoading) {
		return InterestedSpanStatus.Loading;
	}
	if (isNotFound) {
		return InterestedSpanStatus.NotFound;
	}
	// The span exists but the thread is empty, so the no-AI-spans state applies.
	if (spans.length === 0) {
		return InterestedSpanStatus.None;
	}
	return spans.some((span) => span.span_id === interestedSpanId)
		? InterestedSpanStatus.Found
		: InterestedSpanStatus.NoIOMessages;
}

function getThreadSummaryAttributes(
	summary: SpantypesGettableTraceSummaryDTO,
): Record<string, unknown> {
	return {
		[TraceDetailEventKeys.DetailsTab]: TraceDetailsTab.Thread,
		[TraceDetailEventKeys.TotalSpansCount]: summary.totalSpansCount,
		[TraceDetailEventKeys.TraceDurationMs]:
			summary.endTimestampMillis - summary.startTimestampMillis,
		[TraceDetailEventKeys.HadErrors]: summary.totalErrorSpansCount > 0,
	};
}

export function getThreadDataLoadedEventAttributes(
	summary: SpantypesGettableTraceSummaryDTO,
	spanPanelVariant: SpanDetailVariant,
): Record<string, unknown> {
	return {
		...getThreadSummaryAttributes(summary),
		[TraceDetailEventKeys.SpanPanelVariant]: spanPanelVariant,
	};
}

export function getThreadEmptyWithAiEventAttributes(
	summary: SpantypesGettableTraceSummaryDTO,
	interestedSpanId: string | undefined,
): Record<string, unknown> {
	return {
		...getThreadSummaryAttributes(summary),
		[TraceDetailEventKeys.SpanId]: interestedSpanId,
		[TraceDetailEventKeys.RootServiceName]: summary.rootServiceName,
		[TraceDetailEventKeys.RootServiceEntryPoint]: summary.rootServiceEntryPoint,
		[TraceDetailEventKeys.HasMissingSpans]: summary.hasMissingSpans,
		[TraceDetailEventKeys.InputTokens]: summary.ai?.tokens.input,
		[TraceDetailEventKeys.OutputTokens]: summary.ai?.tokens.output,
		[TraceDetailEventKeys.CacheReadTokens]: summary.ai?.tokens.cacheRead,
		[TraceDetailEventKeys.CacheWriteTokens]: summary.ai?.tokens.cacheWrite,
		[TraceDetailEventKeys.ReasoningTokens]: summary.ai?.tokens.reasoning,
		[TraceDetailEventKeys.TotalCost]: summary.ai?.totalCost,
	};
}
