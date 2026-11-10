import { act, renderHook } from '@testing-library/react';

import { TraceDetailEvents } from '../../events';
import { useTraceDetailLogEvent } from '../useTraceDetailLogEvent';

const logEventMock = jest.fn();

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: (...args: unknown[]): void => logEventMock(...args),
}));

describe('useTraceDetailLogEvent', () => {
	beforeEach(() => {
		logEventMock.mockClear();
	});

	it('injects view and traceId on every event', () => {
		const { result } = renderHook(() =>
			useTraceDetailLogEvent('v3', 'trace-123'),
		);

		act(() => {
			result.current(TraceDetailEvents.DataLoaded, { totalSpansCount: 42 });
		});

		expect(logEventMock).toHaveBeenCalledTimes(1);
		expect(logEventMock).toHaveBeenCalledWith(TraceDetailEvents.DataLoaded, {
			view: 'v3',
			traceId: 'trace-123',
			totalSpansCount: 42,
		});
	});

	it('injects view and traceId even when no attributes are passed', () => {
		const { result } = renderHook(() =>
			useTraceDetailLogEvent('v2', 'trace-456'),
		);

		act(() => {
			result.current(TraceDetailEvents.ViewSwitched);
		});

		expect(logEventMock).toHaveBeenCalledWith(TraceDetailEvents.ViewSwitched, {
			view: 'v2',
			traceId: 'trace-456',
		});
	});

	it('keeps a stable callback identity and emits the latest traceId', () => {
		const { result, rerender } = renderHook(
			({ traceId }) => useTraceDetailLogEvent('v3', traceId),
			{ initialProps: { traceId: 'trace-1' } },
		);

		const firstIdentity = result.current;
		rerender({ traceId: 'trace-2' });

		expect(result.current).toBe(firstIdentity);

		act(() => {
			result.current(TraceDetailEvents.SpanPanelTabChanged, { spanId: 's1' });
		});
		expect(logEventMock).toHaveBeenCalledWith(
			TraceDetailEvents.SpanPanelTabChanged,
			{
				view: 'v3',
				traceId: 'trace-2',
				spanId: 's1',
			},
		);
	});

	it('never throws if logEvent throws (analytics must not break the UI)', () => {
		logEventMock.mockImplementationOnce(() => {
			throw new Error('network down');
		});
		const { result } = renderHook(() =>
			useTraceDetailLogEvent('v3', 'trace-123'),
		);

		expect(() => {
			act(() => {
				result.current(TraceDetailEvents.DataLoaded);
			});
		}).not.toThrow();
	});
});
