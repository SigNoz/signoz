import useUrlQuery from 'hooks/useUrlQuery';
import { fireEvent, render, screen } from 'tests/test-utils';
import { Span } from 'types/api/trace/getTraceV2';

import { SpanDuration } from '../Success';

// Constants to avoid string duplication
const SPAN_DURATION_TEXT = '1.16 ms';
const SPAN_DURATION_CLASS = '.span-duration';
const INTERESTED_SPAN_CLASS = 'interested-span';
const HIGHLIGHTED_SPAN_CLASS = 'highlighted-span';
const DIMMED_SPAN_CLASS = 'dimmed-span';
const SELECTED_NON_MATCHING_SPAN_CLASS = 'selected-non-matching-span';

// Mock the hooks
jest.mock('hooks/useUrlQuery');
jest.mock('@signozhq/badge', () => ({
	Badge: jest.fn(),
}));

const mockSpan: Span = {
	spanId: 'test-span-id',
	name: 'test-span',
	serviceName: 'test-service',
	durationNano: 1160000, // 1ms in nano
	timestamp: 1234567890,
	rootSpanId: 'test-root-span-id',
	parentSpanId: 'test-parent-span-id',
	traceId: 'test-trace-id',
	hasError: false,
	kind: 0,
	references: [],
	tagMap: {},
	event: [],
	rootName: 'test-root-name',
	statusMessage: 'test-status-message',
	statusCodeString: 'test-status-code-string',
	spanKind: 'test-span-kind',
	hasChildren: false,
	hasSibling: false,
	subTreeNodeCount: 0,
	level: 0,
};

const mockTraceMetadata = {
	traceId: 'test-trace-id',
	startTime: 1234567000,
	endTime: 1234569000,
	hasMissingSpans: false,
};

const mockSafeNavigate = jest.fn();

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

describe('SpanDuration', () => {
	const mockSetSelectedSpan = jest.fn();
	const mockUrlQuerySet = jest.fn();
	const mockUrlQueryGet = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock URL query hook
		(useUrlQuery as jest.Mock).mockReturnValue({
			set: mockUrlQuerySet,
			get: mockUrlQueryGet,
			toString: () => 'spanId=test-span-id',
		});
	});

	it('calls handleSpanClick when clicked', () => {
		const mockHandleSpanClick = jest.fn();

		render(
			<SpanDuration
				span={mockSpan}
				traceMetadata={mockTraceMetadata}
				selectedSpan={undefined}
				handleSpanClick={mockHandleSpanClick}
				filteredSpanIds={[]}
				isFilterActive={false}
			/>,
		);

		// Find and click the span duration element
		const spanElement = screen.getByText(SPAN_DURATION_TEXT);
		fireEvent.click(spanElement);

		// Verify handleSpanClick was called with the correct span
		expect(mockHandleSpanClick).toHaveBeenCalledWith(mockSpan);
	});

	it('shows action buttons on hover', () => {
		render(
			<SpanDuration
				span={mockSpan}
				traceMetadata={mockTraceMetadata}
				selectedSpan={undefined}
				handleSpanClick={mockSetSelectedSpan}
				filteredSpanIds={[]}
				isFilterActive={false}
			/>,
		);

		const spanElement = screen.getByText(SPAN_DURATION_TEXT);

		// Initially, action buttons should not be visible
		expect(screen.queryByRole('button')).not.toBeInTheDocument();

		// Hover over the span
		fireEvent.mouseEnter(spanElement);

		// Action buttons should now be visible
		expect(screen.getByRole('button')).toBeInTheDocument();

		// Mouse leave should hide the buttons
		fireEvent.mouseLeave(spanElement);
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('applies interested-span class when span is selected', () => {
		render(
			<SpanDuration
				span={mockSpan}
				traceMetadata={mockTraceMetadata}
				selectedSpan={mockSpan}
				handleSpanClick={mockSetSelectedSpan}
				filteredSpanIds={[]}
				isFilterActive={false}
			/>,
		);

		// eslint-disable-next-line sonarjs/no-duplicate-string
		const spanElement = screen
			.getByText(SPAN_DURATION_TEXT)
			.closest(SPAN_DURATION_CLASS);
		expect(spanElement).toHaveClass(INTERESTED_SPAN_CLASS);
	});

	it('applies highlighted-span class when span matches filter', () => {
		render(
			<SpanDuration
				span={mockSpan}
				traceMetadata={mockTraceMetadata}
				selectedSpan={undefined}
				handleSpanClick={mockSetSelectedSpan}
				filteredSpanIds={[mockSpan.spanId]}
				isFilterActive
			/>,
		);

		const spanElement = screen
			.getByText(SPAN_DURATION_TEXT)
			.closest(SPAN_DURATION_CLASS);
		expect(spanElement).toHaveClass(HIGHLIGHTED_SPAN_CLASS);
		expect(spanElement).not.toHaveClass(INTERESTED_SPAN_CLASS);
	});

	it('applies dimmed-span class when span does not match filter', () => {
		render(
			<SpanDuration
				span={mockSpan}
				traceMetadata={mockTraceMetadata}
				selectedSpan={undefined}
				handleSpanClick={mockSetSelectedSpan}
				filteredSpanIds={['other-span-id']}
				isFilterActive
			/>,
		);

		const spanElement = screen
			.getByText(SPAN_DURATION_TEXT)
			.closest(SPAN_DURATION_CLASS);
		expect(spanElement).toHaveClass(DIMMED_SPAN_CLASS);
		expect(spanElement).not.toHaveClass(HIGHLIGHTED_SPAN_CLASS);
	});

	it('prioritizes interested-span over highlighted-span when span is selected and matches filter', () => {
		render(
			<SpanDuration
				span={mockSpan}
				traceMetadata={mockTraceMetadata}
				selectedSpan={mockSpan}
				handleSpanClick={mockSetSelectedSpan}
				filteredSpanIds={[mockSpan.spanId]}
				isFilterActive
			/>,
		);

		const spanElement = screen
			.getByText(SPAN_DURATION_TEXT)
			.closest(SPAN_DURATION_CLASS);
		expect(spanElement).toHaveClass(INTERESTED_SPAN_CLASS);
		expect(spanElement).not.toHaveClass(HIGHLIGHTED_SPAN_CLASS);
		expect(spanElement).not.toHaveClass(DIMMED_SPAN_CLASS);
	});

	it('applies selected-non-matching-span class when span is selected but does not match filter', () => {
		render(
			<SpanDuration
				span={mockSpan}
				traceMetadata={mockTraceMetadata}
				selectedSpan={mockSpan}
				handleSpanClick={mockSetSelectedSpan}
				filteredSpanIds={['different-span-id']}
				isFilterActive
			/>,
		);

		const spanElement = screen
			.getByText(SPAN_DURATION_TEXT)
			.closest(SPAN_DURATION_CLASS);
		expect(spanElement).toHaveClass(SELECTED_NON_MATCHING_SPAN_CLASS);
		expect(spanElement).not.toHaveClass(INTERESTED_SPAN_CLASS);
		expect(spanElement).not.toHaveClass(HIGHLIGHTED_SPAN_CLASS);
		expect(spanElement).not.toHaveClass(DIMMED_SPAN_CLASS);
	});

	it('applies interested-span class when span is selected and no filter is active', () => {
		render(
			<SpanDuration
				span={mockSpan}
				traceMetadata={mockTraceMetadata}
				selectedSpan={mockSpan}
				handleSpanClick={mockSetSelectedSpan}
				filteredSpanIds={[]}
				isFilterActive={false}
			/>,
		);

		const spanElement = screen
			.getByText(SPAN_DURATION_TEXT)
			.closest(SPAN_DURATION_CLASS);
		expect(spanElement).toHaveClass(INTERESTED_SPAN_CLASS);
		expect(spanElement).not.toHaveClass(SELECTED_NON_MATCHING_SPAN_CLASS);
		expect(spanElement).not.toHaveClass(HIGHLIGHTED_SPAN_CLASS);
		expect(spanElement).not.toHaveClass(DIMMED_SPAN_CLASS);
	});

	it('dims span when filter is active but no matches found', () => {
		render(
			<SpanDuration
				span={mockSpan}
				traceMetadata={mockTraceMetadata}
				selectedSpan={undefined}
				handleSpanClick={mockSetSelectedSpan}
				filteredSpanIds={[]} // Empty array but filter is active
				isFilterActive // This is the key difference
			/>,
		);

		const spanElement = screen
			.getByText(SPAN_DURATION_TEXT)
			.closest(SPAN_DURATION_CLASS);
		expect(spanElement).toHaveClass(DIMMED_SPAN_CLASS);
		expect(spanElement).not.toHaveClass(HIGHLIGHTED_SPAN_CLASS);
		expect(spanElement).not.toHaveClass(INTERESTED_SPAN_CLASS);
	});
});
