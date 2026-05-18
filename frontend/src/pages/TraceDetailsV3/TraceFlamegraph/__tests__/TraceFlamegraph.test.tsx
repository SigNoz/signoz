import { render } from '@testing-library/react';
import useGetTraceFlamegraph from 'hooks/trace/useGetTraceFlamegraph';
import { AllTheProviders } from 'tests/test-utils';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import { FLAMEGRAPH_SPAN_LIMIT } from '../constants';
import TraceFlamegraph from '../TraceFlamegraph';

jest.mock('hooks/trace/useGetTraceFlamegraph');

// Short-circuit the worker so the test doesn't depend on layout computation.
jest.mock('../hooks/useVisualLayoutWorker', () => ({
	useVisualLayoutWorker: (): unknown => ({
		layout: { totalVisualRows: 0, visualRows: [] },
		isComputing: false,
		error: null,
	}),
}));

const mockUseGetTraceFlamegraph = useGetTraceFlamegraph as jest.MockedFunction<
	typeof useGetTraceFlamegraph
>;

function renderFlamegraph(props: {
	selectedSpan: SpanV3 | undefined;
	totalSpansCount: number;
}): ReturnType<typeof render> {
	return render(
		<AllTheProviders>
			<TraceFlamegraph
				filteredSpanIds={[]}
				isFilterActive={false}
				selectedSpan={props.selectedSpan}
				totalSpansCount={props.totalSpansCount}
			/>
		</AllTheProviders>,
	);
}

function makeSpan(spanId: string): SpanV3 {
	return { span_id: spanId } as SpanV3;
}

describe('TraceFlamegraph - selectedSpanId pass-through', () => {
	beforeEach(() => {
		mockUseGetTraceFlamegraph.mockReset();
		mockUseGetTraceFlamegraph.mockReturnValue({
			data: { payload: { spans: [] } },
			isFetching: false,
			error: null,
		} as never);
	});

	it('passes selectedSpanId: undefined when below sampling threshold and no selection', () => {
		renderFlamegraph({ selectedSpan: undefined, totalSpansCount: 500 });
		expect(mockUseGetTraceFlamegraph).toHaveBeenLastCalledWith(
			expect.objectContaining({ selectedSpanId: undefined }),
		);
	});

	it('omits selectedSpanId even when a span is selected, if trace is not sampled', () => {
		renderFlamegraph({ selectedSpan: makeSpan('abc'), totalSpansCount: 500 });
		expect(mockUseGetTraceFlamegraph).toHaveBeenLastCalledWith(
			expect.objectContaining({ selectedSpanId: undefined }),
		);
	});

	it('passes selectedSpan.span_id when trace is sampled and a span is selected', () => {
		renderFlamegraph({
			selectedSpan: makeSpan('abc'),
			totalSpansCount: 500_000,
		});
		expect(mockUseGetTraceFlamegraph).toHaveBeenLastCalledWith(
			expect.objectContaining({ selectedSpanId: 'abc' }),
		);
	});

	it('refetches with the new id when a different span is selected in sampled mode', () => {
		const { rerender } = renderFlamegraph({
			selectedSpan: makeSpan('abc'),
			totalSpansCount: 500_000,
		});
		rerender(
			<AllTheProviders>
				<TraceFlamegraph
					filteredSpanIds={[]}
					isFilterActive={false}
					selectedSpan={makeSpan('xyz')}
					totalSpansCount={500_000}
				/>
			</AllTheProviders>,
		);
		expect(mockUseGetTraceFlamegraph).toHaveBeenLastCalledWith(
			expect.objectContaining({ selectedSpanId: 'xyz' }),
		);
		expect(mockUseGetTraceFlamegraph.mock.calls.length).toBeGreaterThanOrEqual(2);
	});

	it('treats totalSpansCount === FLAMEGRAPH_SPAN_LIMIT as non-sampled', () => {
		renderFlamegraph({
			selectedSpan: makeSpan('abc'),
			totalSpansCount: FLAMEGRAPH_SPAN_LIMIT,
		});
		expect(mockUseGetTraceFlamegraph).toHaveBeenLastCalledWith(
			expect.objectContaining({ selectedSpanId: undefined }),
		);
	});
});
