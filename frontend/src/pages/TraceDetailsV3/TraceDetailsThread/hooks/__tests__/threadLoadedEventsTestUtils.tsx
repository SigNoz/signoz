import { MutableRefObject, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import {
	GetTraceSummary200,
	SpantypesGettableTraceSummaryDTO,
} from 'api/generated/services/sigNoz.schemas';
import { getGetTraceSummaryQueryKey } from 'api/generated/services/tracedetail';
import { rest, server } from 'mocks-server/server';
import { renderHook, waitFor } from 'tests/test-utils';

import { TraceDetailLogEvent } from '../../../hooks/useTraceDetailLogEvent';
import { SpanDetailVariant } from '../../../SpanDetailsPanel/constants';
import { useThreadLoadedEvents } from '../useThreadLoadedEvents';

const BASE_SUMMARY: SpantypesGettableTraceSummaryDTO = {
	startTimestampMillis: 1_000,
	endTimestampMillis: 4_000,
	totalSpansCount: 12,
	totalErrorSpansCount: 2,
	hasMissingSpans: true,
	rootServiceEntryPoint: 'POST /chat',
	rootServiceName: 'agent',
	rootSpanStatusCode: 'STATUS_CODE_ERROR',
};

const SUMMARIES: Record<string, SpantypesGettableTraceSummaryDTO> = {
	'trace-ai': {
		...BASE_SUMMARY,
		ai: {
			tokens: {
				input: 1_200,
				output: 300,
				cacheRead: 50,
				cacheWrite: 10,
				reasoning: 40,
			},
			totalCost: 0.0123,
		},
	},
	'trace-ai-next': {
		...BASE_SUMMARY,
		endTimestampMillis: 1_500,
		totalSpansCount: 4,
		ai: {
			tokens: { input: 80, output: 20, cacheRead: 0, cacheWrite: 0, reasoning: 0 },
			totalCost: 0.0004,
		},
	},
	'trace-no-ai': BASE_SUMMARY,
};

export interface ThreadLoadedEventsProps {
	traceId: string;
	hasSpans?: boolean;
	hasNoThread?: boolean;
	interestedSpanId?: string;
	spanPanelVariant?: SpanDetailVariant;
}

interface RenderOptions {
	dataLoadedFiredForRef?: MutableRefObject<string>;
	threadEmptyFiredForRef?: MutableRefObject<string>;
	queryClient?: QueryClient;
}

interface RenderResult {
	logTraceEvent: jest.MockedFunction<TraceDetailLogEvent>;
	rerender: (props: ThreadLoadedEventsProps) => void;
	unmount: () => void;
	queryClient: QueryClient;
}

/** Serves the fixture summaries and returns the trace ids requested, in order. */
export function mockTraceSummaries(): string[] {
	const requests: string[] = [];
	server.use(
		rest.get('*/api/v1/traces/:traceId/summary', (req, res, ctx) => {
			requests.push(req.params.traceId as string);
			const body: GetTraceSummary200 = {
				status: 'success',
				data: SUMMARIES[req.params.traceId as string],
			};
			return res(ctx.status(200), ctx.json(body));
		}),
	);
	return requests;
}

export function renderThreadLoadedEvents(
	initialProps: ThreadLoadedEventsProps,
	{
		dataLoadedFiredForRef = { current: '' },
		threadEmptyFiredForRef = { current: '' },
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		}),
	}: RenderOptions = {},
): RenderResult {
	const logTraceEvent = jest.fn() as jest.MockedFunction<TraceDetailLogEvent>;
	const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const { rerender, unmount } = renderHook(
		({
			traceId,
			hasSpans = false,
			hasNoThread = false,
			interestedSpanId,
			spanPanelVariant = SpanDetailVariant.DOCKED_RIGHT,
		}: ThreadLoadedEventsProps) =>
			useThreadLoadedEvents({
				traceId,
				interestedSpanId,
				hasSpans,
				hasNoThread,
				spanPanelVariant,
				dataLoadedFiredForRef,
				threadEmptyFiredForRef,
				logTraceEvent,
			}),
		{ initialProps, wrapper },
	);
	return { logTraceEvent, rerender, unmount, queryClient };
}

export async function waitForSummary(
	queryClient: QueryClient,
	traceId: string,
): Promise<void> {
	await waitFor(() =>
		expect(
			queryClient.getQueryData(getGetTraceSummaryQueryKey({ traceID: traceId })),
		).toBeDefined(),
	);
}
