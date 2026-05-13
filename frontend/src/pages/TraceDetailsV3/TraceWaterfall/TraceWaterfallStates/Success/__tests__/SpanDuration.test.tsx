import useUrlQuery from 'hooks/useUrlQuery';
import { fireEvent, render, screen } from 'tests/test-utils';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import { TraceProvider } from '../../../../contexts/TraceContext';
import { SpanDuration } from '../Success';

const renderWithTraceProvider: typeof render = (ui, options) =>
	render(<TraceProvider aggregations={undefined}>{ui}</TraceProvider>, options);

// Constants to avoid string duplication
const SPAN_DURATION_TEXT = '1.16 ms';
const SPAN_DURATION_CLASS = '.span-duration';
const INTERESTED_SPAN_CLASS = 'interested-span';
const HIGHLIGHTED_SPAN_CLASS = 'highlighted-span';
const DIMMED_SPAN_CLASS = 'dimmed-span';
const SELECTED_NON_MATCHING_SPAN_CLASS = 'selected-non-matching-span';

jest.mock('components/TimelineV3/TimelineV3', () => ({
	__esModule: true,
	default: (): null => null,
}));

// Mock the hooks
jest.mock('hooks/useUrlQuery');
jest.mock('@signozhq/ui', () => ({
	Badge: jest.fn(),
}));

const mockSpan: SpanV3 = {
	span_id: 'test-span-id',
	name: 'test-span',
	'service.name': 'test-service',
	duration_nano: 1160000,
	timestamp: 1234567890,
	parent_span_id: 'test-parent-span-id',
	trace_id: 'test-trace-id',
	has_error: false,
	kind: 0,
	kind_string: 'test-span-kind',
	attributes: {},
	resource: {},
	events: [],
	status_message: 'test-status-message',
	status_code: 0,
	status_code_string: 'test-status-code-string',
	has_children: false,
	has_sibling: false,
	sub_tree_node_count: 0,
	level: 0,
	http_method: '',
	http_url: '',
	http_host: '',
	db_name: '',
	db_operation: '',
	external_http_method: '',
	external_http_url: '',
	response_status_code: '',
	is_remote: '',
	flags: 0,
	trace_state: '',
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

		renderWithTraceProvider(
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
		renderWithTraceProvider(
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

		// Hover over the span should add hovered-span class
		fireEvent.mouseEnter(spanElement);

		// Mouse leave should remove hovered-span class
		fireEvent.mouseLeave(spanElement);
	});

	it('applies interested-span class when span is selected', () => {
		renderWithTraceProvider(
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
	});

	it('applies highlighted-span class when span matches filter', () => {
		renderWithTraceProvider(
			<SpanDuration
				span={mockSpan}
				traceMetadata={mockTraceMetadata}
				selectedSpan={undefined}
				handleSpanClick={mockSetSelectedSpan}
				filteredSpanIds={[mockSpan.span_id]}
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
		renderWithTraceProvider(
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
		renderWithTraceProvider(
			<SpanDuration
				span={mockSpan}
				traceMetadata={mockTraceMetadata}
				selectedSpan={mockSpan}
				handleSpanClick={mockSetSelectedSpan}
				filteredSpanIds={[mockSpan.span_id]}
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
		renderWithTraceProvider(
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
		renderWithTraceProvider(
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
		renderWithTraceProvider(
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
