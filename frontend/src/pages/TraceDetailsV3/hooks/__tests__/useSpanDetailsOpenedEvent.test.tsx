import { renderHook } from 'tests/test-utils';

import { TraceDetailsTab } from '../../constants';
import { TraceDetailEvents } from '../../events';
import { useSpanDetailsOpenedEvent } from '../useSpanDetailsOpenedEvent';
import { TraceDetailLogEvent } from '../useTraceDetailLogEvent';

interface PanelProps {
	isOpen: boolean;
	spanId?: string;
}

function renderOpenedEvent(initialProps: PanelProps): {
	logTraceEvent: jest.MockedFunction<TraceDetailLogEvent>;
	rerender: (props: PanelProps) => void;
} {
	const logTraceEvent = jest.fn() as jest.MockedFunction<TraceDetailLogEvent>;
	const { rerender } = renderHook(
		({ isOpen, spanId }: PanelProps) =>
			useSpanDetailsOpenedEvent({
				isOpen,
				spanId,
				detailsTab: TraceDetailsTab.Thread,
				logTraceEvent,
			}),
		{ initialProps },
	);
	return { logTraceEvent, rerender };
}

function openedSpanIds(
	logTraceEvent: jest.MockedFunction<TraceDetailLogEvent>,
): unknown[] {
	return logTraceEvent.mock.calls.map(([, attributes]) => attributes?.spanId);
}

describe('useSpanDetailsOpenedEvent', () => {
	it('waits for the panel to be open on a span, then reports it with the tab', () => {
		const { logTraceEvent, rerender } = renderOpenedEvent({ isOpen: false });
		rerender({ isOpen: true });
		rerender({ isOpen: false, spanId: 'span-1' });

		expect(logTraceEvent).not.toHaveBeenCalled();

		rerender({ isOpen: true, spanId: 'span-1' });

		expect(logTraceEvent).toHaveBeenCalledTimes(1);
		expect(logTraceEvent).toHaveBeenCalledWith(
			TraceDetailEvents.SpanDetailsOpened,
			{ spanId: 'span-1', detailsTab: TraceDetailsTab.Thread },
		);
	});

	it('does not repeat while the same span stays open', () => {
		const { logTraceEvent, rerender } = renderOpenedEvent({
			isOpen: true,
			spanId: 'span-1',
		});
		rerender({ isOpen: true, spanId: 'span-1' });
		rerender({ isOpen: true, spanId: 'span-1' });

		expect(logTraceEvent).toHaveBeenCalledTimes(1);
	});

	it('reports the same span again after the panel is closed and reopened', () => {
		const { logTraceEvent, rerender } = renderOpenedEvent({
			isOpen: true,
			spanId: 'span-1',
		});
		rerender({ isOpen: false });
		rerender({ isOpen: true, spanId: 'span-1' });

		expect(openedSpanIds(logTraceEvent)).toStrictEqual(['span-1', 'span-1']);
	});

	it('reports each span selected while the panel stays open', () => {
		const { logTraceEvent, rerender } = renderOpenedEvent({
			isOpen: true,
			spanId: 'span-1',
		});
		rerender({ isOpen: true, spanId: 'span-2' });
		rerender({ isOpen: true, spanId: 'span-3' });

		expect(openedSpanIds(logTraceEvent)).toStrictEqual([
			'span-1',
			'span-2',
			'span-3',
		]);
	});
});
