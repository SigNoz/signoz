import { act, renderHook } from 'tests/test-utils';

import { useDrawerTraceLayout } from '../useDrawerTraceLayout';

type Args = Parameters<typeof useDrawerTraceLayout>[0];

function renderLayout(
	initialProps: Args,
): ReturnType<
	typeof renderHook<ReturnType<typeof useDrawerTraceLayout>, Args>
> {
	return renderHook((args: Args) => useDrawerTraceLayout(args), {
		initialProps,
	});
}

describe('useDrawerTraceLayout', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('shows the waterfall in the split pane when the trace has no flame graph', () => {
		const { result, rerender } = renderLayout({
			traceId: 'trace-a',
			hasFlamegraph: true,
		});
		act(() => result.current.toggleLayout());
		expect(result.current.splitView).toBe('flamegraph');
		expect(result.current.isWaterfallShown).toBe(false);

		rerender({ traceId: 'trace-a', hasFlamegraph: false });
		expect(result.current.splitView).toBe('waterfall');
		expect(result.current.isWaterfallShown).toBe(true);

		rerender({ traceId: 'trace-a', hasFlamegraph: true });
		expect(result.current.splitView).toBe('flamegraph');
	});

	it('closes an opened flame graph section on a trace without one', () => {
		const { result, rerender } = renderLayout({
			traceId: 'trace-a',
			hasFlamegraph: true,
		});
		act(() => result.current.toggleFlamegraphOpen());
		expect(result.current.isFlamegraphOpen).toBe(true);

		rerender({ traceId: 'trace-a', hasFlamegraph: false });
		expect(result.current.isFlamegraphOpen).toBe(false);
	});

	it('shows no view and no tabs until the first span count loads', () => {
		const { result, rerender } = renderLayout({
			traceId: 'trace-a',
			hasFlamegraph: undefined,
		});
		expect(result.current.isPending).toBe(true);
		expect(result.current.areTabsShown).toBe(false);
		expect(result.current.isWaterfallShown).toBe(false);

		rerender({ traceId: 'trace-a', hasFlamegraph: true });
		expect(result.current.isPending).toBe(false);
		expect(result.current.areTabsShown).toBe(true);
		expect(result.current.isWaterfallShown).toBe(true);
	});

	it('keeps the last trace tabs while the next trace count loads', () => {
		const { result, rerender } = renderLayout({
			traceId: 'trace-a',
			hasFlamegraph: false,
		});
		act(() => result.current.toggleLayout());

		rerender({ traceId: 'trace-b', hasFlamegraph: undefined });
		expect(result.current.isPending).toBe(true);
		expect(result.current.areTabsShown).toBe(true);
		expect(result.current.hasFlamegraph).toBe(false);
		expect(result.current.splitView).toBe('waterfall');

		rerender({ traceId: 'trace-b', hasFlamegraph: true });
		expect(result.current.splitView).toBe('flamegraph');
	});

	it('hides the tabs again once the drawer closes', () => {
		const { result, rerender } = renderLayout({
			traceId: 'trace-a',
			hasFlamegraph: true,
		});
		rerender({ traceId: null, hasFlamegraph: true });
		rerender({ traceId: 'trace-b', hasFlamegraph: undefined });
		expect(result.current.areTabsShown).toBe(false);
	});
});
