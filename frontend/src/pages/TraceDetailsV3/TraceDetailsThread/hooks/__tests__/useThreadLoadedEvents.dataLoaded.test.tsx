import { waitFor } from 'tests/test-utils';

import { TraceDetailsTab } from '../../../constants';
import { TraceDetailEvents } from '../../../events';
import { SpanDetailVariant } from '../../../SpanDetailsPanel/constants';
import {
	mockTraceSummaries,
	renderThreadLoadedEvents,
	ThreadLoadedEventsProps,
	waitForSummary,
} from './threadLoadedEventsTestUtils';

describe('useThreadLoadedEvents: data loaded', () => {
	beforeEach(() => {
		mockTraceSummaries();
	});

	it('waits for the trace summary, then reports it as a thread load', async () => {
		const { logTraceEvent } = renderThreadLoadedEvents({
			traceId: 'trace-ai',
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
		const { logTraceEvent, rerender, queryClient } = renderThreadLoadedEvents({
			traceId: 'trace-ai',
		});
		await waitForSummary(queryClient, 'trace-ai');
		rerender({ traceId: 'trace-ai' });

		expect(logTraceEvent).not.toHaveBeenCalled();

		rerender({ traceId: 'trace-ai', hasSpans: true });

		expect(logTraceEvent).toHaveBeenCalledTimes(1);
	});

	it('reports a trace once, including when the tab is visited again', async () => {
		const dataLoadedFiredForRef = { current: '' };
		const props: ThreadLoadedEventsProps = {
			traceId: 'trace-ai',
			hasSpans: true,
		};
		const firstVisit = renderThreadLoadedEvents(props, { dataLoadedFiredForRef });
		await waitFor(() =>
			expect(firstVisit.logTraceEvent).toHaveBeenCalledTimes(1),
		);
		firstVisit.rerender({
			...props,
			spanPanelVariant: SpanDetailVariant.DOCKED,
		});

		const secondVisit = renderThreadLoadedEvents(props, {
			dataLoadedFiredForRef,
		});
		await waitForSummary(secondVisit.queryClient, 'trace-ai');
		secondVisit.rerender(props);

		expect(firstVisit.logTraceEvent).toHaveBeenCalledTimes(1);
		expect(secondVisit.logTraceEvent).not.toHaveBeenCalled();
	});

	it('reports the next trace with its own summary', async () => {
		const { logTraceEvent, rerender } = renderThreadLoadedEvents({
			traceId: 'trace-ai',
			hasSpans: true,
		});
		await waitFor(() => expect(logTraceEvent).toHaveBeenCalledTimes(1));

		rerender({ traceId: 'trace-ai-next', hasSpans: true });

		await waitFor(() => expect(logTraceEvent).toHaveBeenCalledTimes(2));
		expect(logTraceEvent).toHaveBeenLastCalledWith(
			TraceDetailEvents.DataLoaded,
			expect.objectContaining({ totalSpansCount: 4, traceDurationMs: 500 }),
		);
	});

	it('also reports an empty thread, once each, when an errored thread still holds spans', async () => {
		const props: ThreadLoadedEventsProps = {
			traceId: 'trace-ai',
			hasSpans: true,
			hasNoThread: true,
		};
		const { logTraceEvent, rerender } = renderThreadLoadedEvents(props);
		await waitFor(() => expect(logTraceEvent).toHaveBeenCalledTimes(2));
		rerender(props);

		expect(logTraceEvent).toHaveBeenCalledTimes(2);
		expect(logTraceEvent).toHaveBeenCalledWith(
			TraceDetailEvents.DataLoaded,
			expect.any(Object),
		);
		expect(logTraceEvent).toHaveBeenCalledWith(
			TraceDetailEvents.ThreadEmptyWithAiSummary,
			expect.any(Object),
		);
	});
});
