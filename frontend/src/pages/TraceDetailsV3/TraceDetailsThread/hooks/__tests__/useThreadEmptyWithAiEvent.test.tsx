import { MutableRefObject, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import {
	GetTraceSummary200,
	SpantypesGettableTraceSummaryDTO,
} from 'api/generated/services/sigNoz.schemas';
import { getGetTraceSummaryQueryKey } from 'api/generated/services/tracedetail';
import { rest, server } from 'mocks-server/server';
import { renderHook, waitFor } from 'tests/test-utils';

import { TraceDetailsTab } from '../../../constants';
import { TraceDetailEvents } from '../../../events';
import { TraceDetailLogEvent } from '../../../hooks/useTraceDetailLogEvent';
import { useThreadEmptyWithAiEvent } from '../useThreadEmptyWithAiEvent';

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
		totalSpansCount: 4,
		ai: {
			tokens: { input: 80, output: 20, cacheRead: 0, cacheWrite: 0, reasoning: 0 },
			totalCost: 0.0004,
		},
	},
	'trace-no-ai': BASE_SUMMARY,
};

interface HookProps {
	traceId: string;
	hasNoThread: boolean;
	interestedSpanId?: string;
}

interface RenderOptions {
	firedForRef?: MutableRefObject<string>;
	queryClient?: QueryClient;
}

function renderThreadEmptyEvent(
	initialProps: HookProps,
	{
		firedForRef = { current: '' },
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		}),
	}: RenderOptions = {},
): {
	logTraceEvent: jest.MockedFunction<TraceDetailLogEvent>;
	rerender: (props: HookProps) => void;
	unmount: () => void;
	queryClient: QueryClient;
} {
	const logTraceEvent = jest.fn() as jest.MockedFunction<TraceDetailLogEvent>;
	const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const { rerender, unmount } = renderHook(
		({ traceId, hasNoThread, interestedSpanId }: HookProps) =>
			useThreadEmptyWithAiEvent({
				traceId,
				interestedSpanId,
				hasNoThread,
				firedForRef,
				logTraceEvent,
			}),
		{ initialProps, wrapper },
	);
	return { logTraceEvent, rerender, unmount, queryClient };
}

describe('useThreadEmptyWithAiEvent', () => {
	let summaryRequests: string[];

	beforeEach(() => {
		summaryRequests = [];
		server.use(
			rest.get('*/api/v1/traces/:traceId/summary', (req, res, ctx) => {
				summaryRequests.push(req.params.traceId as string);
				const body: GetTraceSummary200 = {
					status: 'success',
					data: SUMMARIES[req.params.traceId as string],
				};
				return res(ctx.status(200), ctx.json(body));
			}),
		);
	});

	it('reports the trace summary when the thread is empty but the summary has AI usage', async () => {
		const { logTraceEvent } = renderThreadEmptyEvent({
			traceId: 'trace-ai',
			hasNoThread: true,
			interestedSpanId: 'span-1',
		});

		await waitFor(() => expect(logTraceEvent).toHaveBeenCalledTimes(1));
		expect(logTraceEvent).toHaveBeenCalledWith(
			TraceDetailEvents.ThreadEmptyWithAiSummary,
			{
				detailsTab: TraceDetailsTab.Thread,
				spanId: 'span-1',
				rootServiceName: 'agent',
				rootServiceEntryPoint: 'POST /chat',
				totalSpansCount: 12,
				traceDurationMs: 3_000,
				hadErrors: true,
				hasMissingSpans: true,
				inputTokens: 1_200,
				outputTokens: 300,
				cacheReadTokens: 50,
				cacheWriteTokens: 10,
				reasoningTokens: 40,
				totalCost: 0.0123,
			},
		);
	});

	it('does not report when the summary has no AI usage', async () => {
		const { logTraceEvent, queryClient } = renderThreadEmptyEvent({
			traceId: 'trace-no-ai',
			hasNoThread: true,
		});

		await waitFor(() =>
			expect(
				queryClient.getQueryData(
					getGetTraceSummaryQueryKey({ traceID: 'trace-no-ai' }),
				),
			).toBeDefined(),
		);
		expect(logTraceEvent).not.toHaveBeenCalled();
	});

	it('waits until the thread is known to be empty', async () => {
		const { logTraceEvent, rerender, queryClient } = renderThreadEmptyEvent({
			traceId: 'trace-ai',
			hasNoThread: false,
		});
		await waitFor(() =>
			expect(
				queryClient.getQueryData(
					getGetTraceSummaryQueryKey({ traceID: 'trace-ai' }),
				),
			).toBeDefined(),
		);
		expect(logTraceEvent).not.toHaveBeenCalled();

		rerender({ traceId: 'trace-ai', hasNoThread: true });

		await waitFor(() => expect(logTraceEvent).toHaveBeenCalledTimes(1));
	});

	it('reports once per trace and reuses the loaded summary when the tab is visited again', async () => {
		const firedForRef = { current: '' };
		const first = renderThreadEmptyEvent(
			{ traceId: 'trace-ai', hasNoThread: true },
			{ firedForRef },
		);
		await waitFor(() => expect(first.logTraceEvent).toHaveBeenCalledTimes(1));
		first.unmount();

		const second = renderThreadEmptyEvent(
			{ traceId: 'trace-ai', hasNoThread: true },
			{ firedForRef, queryClient: first.queryClient },
		);

		expect(second.queryClient.isFetching()).toBe(0);
		expect(summaryRequests).toStrictEqual(['trace-ai']);
		expect(second.logTraceEvent).not.toHaveBeenCalled();
	});

	it('reports the next trace with its own summary', async () => {
		const { logTraceEvent, rerender } = renderThreadEmptyEvent({
			traceId: 'trace-ai',
			hasNoThread: true,
		});
		await waitFor(() => expect(logTraceEvent).toHaveBeenCalledTimes(1));

		rerender({ traceId: 'trace-ai-next', hasNoThread: true });

		await waitFor(() => expect(logTraceEvent).toHaveBeenCalledTimes(2));
		expect(logTraceEvent).toHaveBeenLastCalledWith(
			TraceDetailEvents.ThreadEmptyWithAiSummary,
			expect.objectContaining({
				totalSpansCount: 4,
				inputTokens: 80,
				totalCost: 0.0004,
			}),
		);
	});
});
