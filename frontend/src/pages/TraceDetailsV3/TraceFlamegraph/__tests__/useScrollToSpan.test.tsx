import type { Dispatch, SetStateAction } from 'react';
import { useRef } from 'react';
import { act, render, waitFor } from '@testing-library/react';

import { useScrollToSpan } from '../hooks/useScrollToSpan';
import { MOCK_SPANS, MOCK_TRACE_METADATA } from './testUtils';

function TestWrapper({
	firstSpanAtFetchLevel,
	spans,
	traceMetadata,
	setViewStartTs,
	setViewEndTs,
	setScrollTop,
}: {
	firstSpanAtFetchLevel: string;
	spans: typeof MOCK_SPANS;
	traceMetadata: typeof MOCK_TRACE_METADATA;
	setViewStartTs: Dispatch<SetStateAction<number>>;
	setViewEndTs: Dispatch<SetStateAction<number>>;
	setScrollTop: Dispatch<SetStateAction<number>>;
}): JSX.Element {
	const containerRef = useRef<HTMLDivElement>(null);
	const viewStartRef = useRef(traceMetadata.startTime);
	const viewEndRef = useRef(traceMetadata.endTime);
	const scrollTopRef = useRef(0);

	useScrollToSpan({
		firstSpanAtFetchLevel,
		spans,
		traceMetadata,
		containerRef,
		viewStartRef,
		viewEndRef,
		scrollTopRef,
		rowHeight: 24,
		setViewStartTs,
		setViewEndTs,
		setScrollTop,
	});

	return <div ref={containerRef} data-testid="container" />;
}

describe('useScrollToSpan', () => {
	beforeEach(() => {
		Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
			configurable: true,
			value: 400,
		});
	});

	it('does not update when firstSpanAtFetchLevel is empty', async () => {
		const setViewStartTs = jest.fn();
		const setViewEndTs = jest.fn();
		const setScrollTop = jest.fn();

		render(
			<TestWrapper
				firstSpanAtFetchLevel=""
				spans={MOCK_SPANS}
				traceMetadata={MOCK_TRACE_METADATA}
				setViewStartTs={setViewStartTs}
				setViewEndTs={setViewEndTs}
				setScrollTop={setScrollTop}
			/>,
		);

		await waitFor(() => {
			expect(setViewStartTs).not.toHaveBeenCalled();
			expect(setViewEndTs).not.toHaveBeenCalled();
			expect(setScrollTop).not.toHaveBeenCalled();
		});
	});

	it('does not update when spans are empty', async () => {
		const setViewStartTs = jest.fn();
		const setViewEndTs = jest.fn();
		const setScrollTop = jest.fn();

		render(
			<TestWrapper
				firstSpanAtFetchLevel="root"
				spans={[]}
				traceMetadata={MOCK_TRACE_METADATA}
				setViewStartTs={setViewStartTs}
				setViewEndTs={setViewEndTs}
				setScrollTop={setScrollTop}
			/>,
		);

		await waitFor(() => {
			expect(setViewStartTs).not.toHaveBeenCalled();
			expect(setViewEndTs).not.toHaveBeenCalled();
			expect(setScrollTop).not.toHaveBeenCalled();
		});
	});

	it('does not update when target span not found', async () => {
		const setViewStartTs = jest.fn();
		const setViewEndTs = jest.fn();
		const setScrollTop = jest.fn();

		render(
			<TestWrapper
				firstSpanAtFetchLevel="nonexistent"
				spans={MOCK_SPANS}
				traceMetadata={MOCK_TRACE_METADATA}
				setViewStartTs={setViewStartTs}
				setViewEndTs={setViewEndTs}
				setScrollTop={setScrollTop}
			/>,
		);

		await waitFor(() => {
			expect(setViewStartTs).not.toHaveBeenCalled();
			expect(setViewEndTs).not.toHaveBeenCalled();
			expect(setScrollTop).not.toHaveBeenCalled();
		});
	});

	it('calls setters when target span found', async () => {
		const setViewStartTs = jest.fn();
		const setViewEndTs = jest.fn();
		const setScrollTop = jest.fn();

		const { getByTestId } = render(
			<TestWrapper
				firstSpanAtFetchLevel="grandchild"
				spans={MOCK_SPANS}
				traceMetadata={MOCK_TRACE_METADATA}
				setViewStartTs={setViewStartTs}
				setViewEndTs={setViewEndTs}
				setScrollTop={setScrollTop}
			/>,
		);

		expect(getByTestId('container')).toBeInTheDocument();

		await waitFor(() => {
			expect(setViewStartTs).toHaveBeenCalled();
			expect(setViewEndTs).toHaveBeenCalled();
			expect(setScrollTop).toHaveBeenCalled();
		});

		const [viewStart] = setViewStartTs.mock.calls[0];
		const [viewEnd] = setViewEndTs.mock.calls[0];
		const [scrollTop] = setScrollTop.mock.calls[0];

		expect(viewEnd - viewStart).toBeGreaterThan(0);
		expect(viewStart).toBeGreaterThanOrEqual(MOCK_TRACE_METADATA.startTime);
		expect(viewEnd).toBeLessThanOrEqual(MOCK_TRACE_METADATA.endTime);
		expect(scrollTop).toBeGreaterThanOrEqual(0);
	});

	it('centers span vertically (scrollTop centers span row)', async () => {
		const setScrollTop = jest.fn();

		await act(async () => {
			render(
				<TestWrapper
					firstSpanAtFetchLevel="grandchild"
					spans={MOCK_SPANS}
					traceMetadata={MOCK_TRACE_METADATA}
					setViewStartTs={jest.fn()}
					setViewEndTs={jest.fn()}
					setScrollTop={setScrollTop}
				/>,
			);
		});

		await waitFor(() => expect(setScrollTop).toHaveBeenCalled());

		const [scrollTop] = setScrollTop.mock.calls[0];
		const levelIndex = 2;
		const rowHeight = 24;
		const viewportHeight = 400;
		const expectedCenter =
			levelIndex * rowHeight - viewportHeight / 2 + rowHeight / 2;
		expect(scrollTop).toBeCloseTo(Math.max(0, expectedCenter), -1);
	});

	it('zooms horizontally to span with 2x duration padding', async () => {
		const setViewStartTs = jest.fn();
		const setViewEndTs = jest.fn();

		await act(async () => {
			render(
				<TestWrapper
					firstSpanAtFetchLevel="root"
					spans={MOCK_SPANS}
					traceMetadata={MOCK_TRACE_METADATA}
					setViewStartTs={setViewStartTs}
					setViewEndTs={setViewEndTs}
					setScrollTop={jest.fn()}
				/>,
			);
		});

		await waitFor(() => {
			expect(setViewStartTs).toHaveBeenCalled();
			expect(setViewEndTs).toHaveBeenCalled();
		});

		const [viewStart] = setViewStartTs.mock.calls[0];
		const [viewEnd] = setViewEndTs.mock.calls[0];
		const visibleWindow = viewEnd - viewStart;
		const rootSpan = MOCK_SPANS[0][0];
		const spanDurationMs = rootSpan.durationNano / 1e6;
		expect(visibleWindow).toBeGreaterThanOrEqual(Math.max(spanDurationMs * 2, 5));
	});
});
