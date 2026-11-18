import { waitFor } from 'tests/test-utils';

import { TraceDetailsTab } from '../../../constants';
import { TraceDetailEvents } from '../../../events';
import {
	mockTraceSummaries,
	renderThreadLoadedEvents,
	ThreadLoadedEventsProps,
	waitForSummary,
} from './threadLoadedEventsTestUtils';

describe('useThreadLoadedEvents: thread empty with AI summary', () => {
	let summaryRequests: string[];

	beforeEach(() => {
		summaryRequests = mockTraceSummaries();
	});

	it('reports the trace summary when the thread is empty but the summary has AI usage', async () => {
		const { logTraceEvent } = renderThreadLoadedEvents({
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
		const props: ThreadLoadedEventsProps = {
			traceId: 'trace-no-ai',
			hasNoThread: true,
		};
		const { logTraceEvent, rerender, queryClient } =
			renderThreadLoadedEvents(props);
		await waitForSummary(queryClient, 'trace-no-ai');
		rerender(props);

		expect(logTraceEvent).not.toHaveBeenCalled();
	});

	it('waits until the thread is known to be empty', async () => {
		const { logTraceEvent, rerender, queryClient } = renderThreadLoadedEvents({
			traceId: 'trace-ai',
		});
		await waitForSummary(queryClient, 'trace-ai');
		rerender({ traceId: 'trace-ai' });

		expect(logTraceEvent).not.toHaveBeenCalled();

		rerender({ traceId: 'trace-ai', hasNoThread: true });

		await waitFor(() => expect(logTraceEvent).toHaveBeenCalledTimes(1));
	});

	it('reports once per trace and reuses the loaded summary when the tab is visited again', async () => {
		const threadEmptyFiredForRef = { current: '' };
		const props: ThreadLoadedEventsProps = {
			traceId: 'trace-ai',
			hasNoThread: true,
		};
		const first = renderThreadLoadedEvents(props, { threadEmptyFiredForRef });
		await waitFor(() => expect(first.logTraceEvent).toHaveBeenCalledTimes(1));
		first.unmount();

		const second = renderThreadLoadedEvents(props, {
			threadEmptyFiredForRef,
			queryClient: first.queryClient,
		});

		expect(second.queryClient.isFetching()).toBe(0);
		expect(summaryRequests).toStrictEqual(['trace-ai']);
		expect(second.logTraceEvent).not.toHaveBeenCalled();
	});

	it('reports the next trace with its own summary', async () => {
		const { logTraceEvent, rerender } = renderThreadLoadedEvents({
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
