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
import { SpanDetailVariant } from '../../../SpanDetailsPanel/constants';
import { useThreadDataLoadedEvent } from '../useThreadDataLoadedEvent';

const SUMMARIES: Record<string, SpantypesGettableTraceSummaryDTO> = {
	'trace-a': {
		startTimestampMillis: 1_000,
		endTimestampMillis: 4_000,
		totalSpansCount: 12,
		totalErrorSpansCount: 2,
		hasMissingSpans: false,
		rootServiceEntryPoint: 'POST /chat',
		rootServiceName: 'agent',
		rootSpanStatusCode: 'STATUS_CODE_ERROR',
	},
	'trace-b': {
		startTimestampMillis: 5_000,
		endTimestampMillis: 5_500,
		totalSpansCount: 3,
		totalErrorSpansCount: 0,
		hasMissingSpans: false,
		rootServiceEntryPoint: 'POST /chat',
		rootServiceName: 'agent',
		rootSpanStatusCode: 'STATUS_CODE_OK',
	},
};

interface HookProps {
	traceId: string;
	hasSpans: boolean;
	spanPanelVariant?: SpanDetailVariant;
}

function renderDataLoadedEvent(
	initialProps: HookProps,
	firedForRef: MutableRefObject<string> = { current: '' },
): {
	logTraceEvent: jest.MockedFunction<TraceDetailLogEvent>;
	rerender: (props: HookProps) => void;
	queryClient: QueryClient;
} {
	const logTraceEvent = jest.fn() as jest.MockedFunction<TraceDetailLogEvent>;
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const { rerender } = renderHook(
		({ traceId, hasSpans, spanPanelVariant }: HookProps) =>
			useThreadDataLoadedEvent({
				traceId,
				hasSpans,
				spanPanelVariant: spanPanelVariant ?? SpanDetailVariant.DOCKED_RIGHT,
				firedForRef,
				logTraceEvent,
			}),
		{ initialProps, wrapper },
	);
	return { logTraceEvent, rerender, queryClient };
}

describe('useThreadDataLoadedEvent', () => {
	beforeEach(() => {
		server.use(
			rest.get('*/api/v1/traces/:traceId/summary', (req, res, ctx) => {
				const body: GetTraceSummary200 = {
					status: 'success',
					data: SUMMARIES[req.params.traceId as string],
				};
				return res(ctx.status(200), ctx.json(body));
			}),
		);
	});

	it('waits for the trace summary, then reports it as a thread load', async () => {
		const { logTraceEvent } = renderDataLoadedEvent({
			traceId: 'trace-a',
			hasSpans: true,
		});

		expect(logTraceEvent).not.toHaveBeenCalled();

		await waitFor(() => expect(logTraceEvent).toHaveBeenCalledTimes(1));
		expect(logTraceEvent).toHaveBeenCalledWith(TraceDetailEvents.DataLoaded, {
			detailsTab: TraceDetailsTab.Thread,
			totalSpansCount: 12,
			traceDurationMs: 3_000,
			hadErrors: true,
			spanPanelVariant: SpanDetailVariant.DOCKED_RIGHT,
		});
	});

	it('waits for the thread spans even when the summary is already loaded', async () => {
		const { logTraceEvent, rerender, queryClient } = renderDataLoadedEvent({
			traceId: 'trace-a',
			hasSpans: false,
		});
		await waitFor(() =>
			expect(
				queryClient.getQueryData(
					getGetTraceSummaryQueryKey({ traceID: 'trace-a' }),
				),
			).toBeDefined(),
		);
		rerender({ traceId: 'trace-a', hasSpans: false });

		expect(logTraceEvent).not.toHaveBeenCalled();

		rerender({ traceId: 'trace-a', hasSpans: true });

		expect(logTraceEvent).toHaveBeenCalledTimes(1);
	});

	it('reports a trace once, including when the tab is visited again', async () => {
		const firedForRef = { current: '' };
		const firstVisit = renderDataLoadedEvent(
			{ traceId: 'trace-a', hasSpans: true },
			firedForRef,
		);
		await waitFor(() =>
			expect(firstVisit.logTraceEvent).toHaveBeenCalledTimes(1),
		);
		firstVisit.rerender({
			traceId: 'trace-a',
			hasSpans: true,
			spanPanelVariant: SpanDetailVariant.DOCKED,
		});

		const secondVisit = renderDataLoadedEvent(
			{ traceId: 'trace-a', hasSpans: true },
			firedForRef,
		);
		await waitFor(() =>
			expect(
				secondVisit.queryClient.getQueryData(
					getGetTraceSummaryQueryKey({ traceID: 'trace-a' }),
				),
			).toBeDefined(),
		);
		secondVisit.rerender({ traceId: 'trace-a', hasSpans: true });

		expect(firstVisit.logTraceEvent).toHaveBeenCalledTimes(1);
		expect(secondVisit.logTraceEvent).not.toHaveBeenCalled();
	});

	it('reports the next trace with its own summary', async () => {
		const { logTraceEvent, rerender } = renderDataLoadedEvent({
			traceId: 'trace-a',
			hasSpans: true,
		});
		await waitFor(() => expect(logTraceEvent).toHaveBeenCalledTimes(1));

		rerender({ traceId: 'trace-b', hasSpans: true });

		await waitFor(() => expect(logTraceEvent).toHaveBeenCalledTimes(2));
		expect(logTraceEvent).toHaveBeenLastCalledWith(
			TraceDetailEvents.DataLoaded,
			expect.objectContaining({ totalSpansCount: 3, traceDurationMs: 500 }),
		);
	});
});
