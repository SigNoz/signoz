import React from 'react';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import { TraceProvider } from '../../../../contexts/TraceContext';
import Success from '../Success';

const renderWithTraceProvider: typeof render = (ui, options, customOptions) =>
	render(
		<TraceProvider aggregations={undefined}>{ui}</TraceProvider>,
		options,
		customOptions,
	);

// Mock the required hooks with proper typing
const mockSafeNavigate = jest.fn() as jest.MockedFunction<
	(params: { search: string }) => void
>;
const mockUrlQuery = new URLSearchParams();

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: typeof mockSafeNavigate } => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

jest.mock('hooks/useUrlQuery', () => (): URLSearchParams => mockUrlQuery);

// App provider is already handled by test-utils

// React Router is already globally mocked

// Mock complex external dependencies that cause provider issues
jest.mock('components/SpanHoverCard/SpanHoverCard', () => {
	function SpanHoverCard({
		children,
	}: {
		children: React.ReactNode;
	}): JSX.Element {
		return <div>{children}</div>;
	}
	SpanHoverCard.displayName = 'SpanHoverCard';
	return SpanHoverCard;
});

// Mock the Filters component that's causing React Query issues
jest.mock('../Filters/Filters', () => {
	function Filters(): null {
		return null;
	}
	Filters.displayName = 'Filters';
	return Filters;
});

// Mock other potential dependencies
jest.mock(
	'pages/TraceDetailsV3/TraceWaterfall/AddSpanToFunnelModal/AddSpanToFunnelModal',
	() => {
		function AddSpanToFunnelModal(): null {
			return null;
		}
		AddSpanToFunnelModal.displayName = 'AddSpanToFunnelModal';
		return AddSpanToFunnelModal;
	},
);

jest.mock('pages/TraceDetailsV3/TraceWaterfall/SpanLineActionButtons', () => {
	function SpanLineActionButtons(): null {
		return null;
	}
	SpanLineActionButtons.displayName = 'SpanLineActionButtons';
	return SpanLineActionButtons;
});

jest.mock('components/HttpStatusBadge/HttpStatusBadge', () => {
	function HttpStatusBadge(): null {
		return null;
	}
	HttpStatusBadge.displayName = 'HttpStatusBadge';
	return HttpStatusBadge;
});

jest.mock('components/TimelineV3/TimelineV3', () => {
	function TimelineV3(): null {
		return null;
	}
	TimelineV3.displayName = 'TimelineV3';
	return { __esModule: true, default: TimelineV3 };
});

// Mock other utilities that might cause issues
jest.mock('lib/uPlotLib/utils/generateColor', () => ({
	generateColor: (): string => '#1890ff',
	colorToRgb: (): string => '24, 144, 255',
}));

jest.mock('container/TraceDetail/utils', () => ({
	convertTimeToRelevantUnit: (
		value: number,
	): { time: number; timeUnitName: string } => ({
		time: value < 1000 ? value : value / 1000,
		timeUnitName: value < 1000 ? 'ms' : 's',
	}),
}));

jest.mock('utils/toFixed', () => ({
	toFixed: (value: number, decimals: number): string => value.toFixed(decimals),
}));

// Mock useVirtualizer to render all items without actual virtualization
jest.mock('@tanstack/react-virtual', () => ({
	useVirtualizer: ({
		count,
	}: {
		count: number;
	}): {
		getVirtualItems: () => Array<{
			index: number;
			key: number;
			start: number;
			size: number;
		}>;
		getTotalSize: () => number;
		scrollToIndex: jest.Mock;
	} => ({
		getVirtualItems: (): Array<{
			index: number;
			key: number;
			start: number;
			size: number;
		}> =>
			Array.from({ length: count }, (_, i) => ({
				index: i,
				key: i,
				start: i * 54,
				size: 54,
			})),
		getTotalSize: (): number => count * 54,
		scrollToIndex: jest.fn(),
	}),
	Virtualizer: jest.fn(),
}));

const mockTraceMetadata = {
	traceId: 'test-trace-id',
	startTime: 1679748225000000,
	endTime: 1679748226000000,
	hasMissingSpans: false,
};

const createMockSpan = (spanId: string, level = 1): SpanV3 => ({
	span_id: spanId,
	trace_id: 'test-trace-id',
	parent_span_id: level === 0 ? '' : 'span-1',
	name: `Test Span ${spanId}`,
	'service.name': 'test-service',
	timestamp: mockTraceMetadata.startTime + level * 100000,
	duration_nano: 50000000,
	level,
	has_error: false,
	kind: 1,
	kind_string: 'server',
	attributes: {},
	resource: {},
	events: [],
	status_message: '',
	status_code: 0,
	status_code_string: 'OK',
	has_children: false,
	has_sibling: false,
	sub_tree_node_count: 1,
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
});

const mockSpans = [
	createMockSpan('span-1', 0),
	createMockSpan('span-2', 1),
	createMockSpan('span-3', 1),
];

// Shared TestComponent for all tests
function TestComponent(): JSX.Element {
	const [selectedSpan, setSelectedSpan] = React.useState<SpanV3 | undefined>(
		undefined,
	);

	return (
		<Success
			spans={mockSpans}
			traceMetadata={mockTraceMetadata}
			interestedSpanId={{ spanId: '', isUncollapsed: false }}
			uncollapsedNodes={mockSpans.map((s) => s.span_id)}
			isFullDataLoaded={false}
			localUncollapsedNodes={new Set()}
			setLocalUncollapsedNodes={jest.fn()}
			setInterestedSpanId={jest.fn()}
			selectedSpan={selectedSpan}
			setSelectedSpan={setSelectedSpan}
			filteredSpanIds={[]}
			isFilterActive={false}
		/>
	);
}

describe('Span Click User Flows', () => {
	const FIRST_SPAN_TEST_ID = 'cell-0-span-1';
	const FIRST_SPAN_DURATION_TEST_ID = 'cell-1-span-1';
	const SECOND_SPAN_TEST_ID = 'cell-0-span-2';
	const SPAN_OVERVIEW_CLASS = '.span-overview';
	const SPAN_DURATION_CLASS = '.span-duration';
	const INTERESTED_SPAN_CLASS = 'interested-span';
	const SECOND_SPAN_DURATION_TEST_ID = 'cell-1-span-2';

	beforeEach(() => {
		jest.clearAllMocks();
		// Clear all URL parameters
		Array.from(mockUrlQuery.keys()).forEach((key) => mockUrlQuery.delete(key));
	});

	it('clicking span updates URL with spanId parameter', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderWithTraceProvider(
			<Success
				spans={mockSpans}
				traceMetadata={mockTraceMetadata}
				interestedSpanId={{ spanId: '', isUncollapsed: false }}
				uncollapsedNodes={mockSpans.map((s) => s.span_id)}
				isFullDataLoaded={false}
				localUncollapsedNodes={new Set()}
				setLocalUncollapsedNodes={jest.fn()}
				setInterestedSpanId={jest.fn()}
				selectedSpan={undefined}
				setSelectedSpan={jest.fn()}
				filteredSpanIds={[]}
				isFilterActive={false}
			/>,
			undefined,
			{ initialRoute: '/trace' },
		);

		// Initially URL should not have spanId
		expect(mockUrlQuery.get('spanId')).toBeNull();

		// Click on the actual span element (not the wrapper)
		const spanOverview = screen.getByTestId(FIRST_SPAN_TEST_ID);
		const spanElement = spanOverview.querySelector(
			SPAN_OVERVIEW_CLASS,
		) as HTMLElement;
		await user.click(spanElement);

		// Verify URL was updated with spanId
		expect(mockUrlQuery.get('spanId')).toBe('span-1');
		expect(mockSafeNavigate).toHaveBeenCalledWith({
			search: expect.stringContaining('spanId=span-1'),
		});
	});

	it('clicking span duration visually selects the span', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderWithTraceProvider(<TestComponent />, undefined, {
			initialRoute: '/trace',
		});

		// Wait for initial render and selection
		await waitFor(() => {
			const spanDuration = screen.getByTestId(FIRST_SPAN_DURATION_TEST_ID);
			const spanDurationElement = spanDuration.querySelector(
				SPAN_DURATION_CLASS,
			) as HTMLElement;
			expect(spanDurationElement).toHaveClass(INTERESTED_SPAN_CLASS);
		});

		// Click on span-2 to test selection change
		const span2Duration = screen.getByTestId(SECOND_SPAN_DURATION_TEST_ID);
		const span2DurationElement = span2Duration.querySelector(
			SPAN_DURATION_CLASS,
		) as HTMLElement;
		await user.click(span2DurationElement);

		// Wait for the state update and re-render
		await waitFor(() => {
			const spanDuration = screen.getByTestId(FIRST_SPAN_DURATION_TEST_ID);
			const spanDurationElement = spanDuration.querySelector(
				SPAN_DURATION_CLASS,
			) as HTMLElement;
			const span2Duration = screen.getByTestId(SECOND_SPAN_DURATION_TEST_ID);
			const span2DurationElement = span2Duration.querySelector(
				SPAN_DURATION_CLASS,
			) as HTMLElement;

			expect(spanDurationElement).not.toHaveClass(INTERESTED_SPAN_CLASS);
			expect(span2DurationElement).toHaveClass(INTERESTED_SPAN_CLASS);
		});
	});

	it('both click areas produce the same visual result', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderWithTraceProvider(<TestComponent />, undefined, {
			initialRoute: '/trace',
		});

		// Wait for initial render and selection
		await waitFor(() => {
			const spanOverview = screen.getByTestId(FIRST_SPAN_TEST_ID);
			const spanDuration = screen.getByTestId(FIRST_SPAN_DURATION_TEST_ID);
			const spanOverviewElement = spanOverview.querySelector(
				SPAN_OVERVIEW_CLASS,
			) as HTMLElement;
			const spanDurationElement = spanDuration.querySelector(
				SPAN_DURATION_CLASS,
			) as HTMLElement;

			// Initially both areas should show the same visual selection (first span is auto-selected)
			expect(spanOverviewElement).toHaveClass(INTERESTED_SPAN_CLASS);
			expect(spanDurationElement).toHaveClass(INTERESTED_SPAN_CLASS);
		});

		// Click span-2 to test selection change
		const span2Overview = screen.getByTestId(SECOND_SPAN_TEST_ID);
		const span2Element = span2Overview.querySelector(
			SPAN_OVERVIEW_CLASS,
		) as HTMLElement;
		await user.click(span2Element);

		// Wait for the state update and re-render
		await waitFor(() => {
			const spanOverview = screen.getByTestId(FIRST_SPAN_TEST_ID);
			const spanDuration = screen.getByTestId(FIRST_SPAN_DURATION_TEST_ID);
			const spanOverviewElement = spanOverview.querySelector(
				SPAN_OVERVIEW_CLASS,
			) as HTMLElement;
			const spanDurationElement = spanDuration.querySelector(
				SPAN_DURATION_CLASS,
			) as HTMLElement;

			// Now span-2 should be selected, span-1 should not
			expect(spanOverviewElement).not.toHaveClass(INTERESTED_SPAN_CLASS);
			expect(spanDurationElement).not.toHaveClass(INTERESTED_SPAN_CLASS);

			// Check that span-2 is selected
			const span2Overview = screen.getByTestId(SECOND_SPAN_TEST_ID);
			const span2Duration = screen.getByTestId(SECOND_SPAN_DURATION_TEST_ID);
			const span2OverviewElement = span2Overview.querySelector(
				SPAN_OVERVIEW_CLASS,
			) as HTMLElement;
			const span2DurationElement = span2Duration.querySelector(
				SPAN_DURATION_CLASS,
			) as HTMLElement;

			expect(span2OverviewElement).toHaveClass(INTERESTED_SPAN_CLASS);
			expect(span2DurationElement).toHaveClass(INTERESTED_SPAN_CLASS);
		});
	});

	it('clicking different spans updates selection correctly', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderWithTraceProvider(<TestComponent />, undefined, {
			initialRoute: '/trace',
		});

		// Wait for initial render and selection
		await waitFor(() => {
			const span1Overview = screen.getByTestId(FIRST_SPAN_TEST_ID);
			const span1Element = span1Overview.querySelector(
				SPAN_OVERVIEW_CLASS,
			) as HTMLElement;
			expect(span1Element).toHaveClass(INTERESTED_SPAN_CLASS);
		});

		// Click second span
		const span2Overview = screen.getByTestId(SECOND_SPAN_TEST_ID);
		const span2Element = span2Overview.querySelector(
			SPAN_OVERVIEW_CLASS,
		) as HTMLElement;
		await user.click(span2Element);

		// Wait for the state update and re-render
		await waitFor(() => {
			const span1Overview = screen.getByTestId(FIRST_SPAN_TEST_ID);
			const span1Element = span1Overview.querySelector(
				SPAN_OVERVIEW_CLASS,
			) as HTMLElement;
			const span2Overview = screen.getByTestId(SECOND_SPAN_TEST_ID);
			const span2Element = span2Overview.querySelector(
				SPAN_OVERVIEW_CLASS,
			) as HTMLElement;

			// Second span should be selected, first should not
			expect(span1Element).not.toHaveClass(INTERESTED_SPAN_CLASS);
			expect(span2Element).toHaveClass(INTERESTED_SPAN_CLASS);
		});
	});

	it('preserves existing URL parameters when selecting spans', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		// Pre-populate URL with existing parameters
		mockUrlQuery.set('existingParam', 'existingValue');
		mockUrlQuery.set('anotherParam', 'anotherValue');

		renderWithTraceProvider(
			<Success
				spans={mockSpans}
				traceMetadata={mockTraceMetadata}
				interestedSpanId={{ spanId: '', isUncollapsed: false }}
				uncollapsedNodes={mockSpans.map((s) => s.span_id)}
				isFullDataLoaded={false}
				localUncollapsedNodes={new Set()}
				setLocalUncollapsedNodes={jest.fn()}
				setInterestedSpanId={jest.fn()}
				selectedSpan={undefined}
				setSelectedSpan={jest.fn()}
				filteredSpanIds={[]}
				isFilterActive={false}
			/>,
			undefined,
			{ initialRoute: '/trace' },
		);

		// Click on the actual span element (not the wrapper)
		const spanOverview = screen.getByTestId(FIRST_SPAN_TEST_ID);
		const spanElement = spanOverview.querySelector(
			SPAN_OVERVIEW_CLASS,
		) as HTMLElement;
		await user.click(spanElement);

		// Verify existing parameters are preserved and spanId is added
		expect(mockUrlQuery.get('existingParam')).toBe('existingValue');
		expect(mockUrlQuery.get('anotherParam')).toBe('anotherValue');
		expect(mockUrlQuery.get('spanId')).toBe('span-1');

		// Verify navigation was called with all parameters
		expect(mockSafeNavigate).toHaveBeenCalledWith({
			search: expect.stringMatching(
				/existingParam=existingValue.*anotherParam=anotherValue.*spanId=span-1/,
			),
		});
	});
});
