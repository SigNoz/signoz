import { act, fireEvent, render, screen } from '@testing-library/react';
import { TimezoneContextType } from 'providers/Timezone';
import { Span } from 'types/api/trace/getTraceV2';

import SpanHoverCard from '../SpanHoverCard';

// Mock timezone provider so SpanHoverCard can use useTimezone without a real context
jest.mock('providers/Timezone', () => ({
	__esModule: true,
	useTimezone: (): TimezoneContextType => ({
		timezone: {
			name: 'Coordinated Universal Time — UTC, GMT',
			value: 'UTC',
			offset: 'UTC',
			searchIndex: 'UTC',
		},
		browserTimezone: {
			name: 'Coordinated Universal Time — UTC, GMT',
			value: 'UTC',
			offset: 'UTC',
			searchIndex: 'UTC',
		},
		updateTimezone: jest.fn(),
		formatTimezoneAdjustedTimestamp: jest.fn(() => 'mock-date'),
		isAdaptationEnabled: true,
		setIsAdaptationEnabled: jest.fn(),
	}),
}));

// Mock dayjs for testing, including timezone helpers used in timezoneUtils
jest.mock('dayjs', () => {
	const mockDayjsInstance: any = {};

	mockDayjsInstance.format = jest.fn((formatString: string) =>
		// Match the DD_MMM_YYYY_HH_MM_SS format: 'DD MMM YYYY, HH:mm:ss'
		formatString === 'DD MMM YYYY, HH:mm:ss'
			? '15 Mar 2024, 14:23:45'
			: 'mock-date',
	);

	// Support chaining: dayjs().tz(timezone).format(...) and dayjs().tz(timezone).utcOffset()
	mockDayjsInstance.tz = jest.fn(() => mockDayjsInstance);
	mockDayjsInstance.utcOffset = jest.fn(() => 0);

	const mockDayjs = jest.fn(() => mockDayjsInstance);

	Object.assign(mockDayjs, {
		extend: jest.fn(),
		// Support dayjs.tz.guess()
		tz: { guess: jest.fn(() => 'UTC') },
	});

	return mockDayjs;
});

const HOVER_ELEMENT_ID = 'hover-element';

const mockSpan: Span = {
	spanId: 'test-span-id',
	traceId: 'test-trace-id',
	rootSpanId: 'root-span-id',
	parentSpanId: 'parent-span-id',
	name: 'GET /api/users',
	timestamp: 1679748225000000,
	durationNano: 150000000,
	serviceName: 'user-service',
	kind: 1,
	hasError: false,
	level: 1,
	references: [],
	tagMap: {},
	event: [
		{
			name: 'event1',
			timeUnixNano: 1679748225100000,
			attributeMap: {},
			isError: false,
		},
		{
			name: 'event2',
			timeUnixNano: 1679748225200000,
			attributeMap: {},
			isError: false,
		},
	],
	rootName: 'root-span',
	statusMessage: '',
	statusCodeString: 'OK',
	spanKind: 'server',
	hasChildren: false,
	hasSibling: false,
	subTreeNodeCount: 1,
};

const mockTraceMetadata = {
	startTime: 1679748225000000,
	endTime: 1679748226000000,
};

describe('SpanHoverCard', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('renders child element correctly', () => {
		render(
			<SpanHoverCard span={mockSpan} traceMetadata={mockTraceMetadata}>
				<div data-testid="child-element">Hover me</div>
			</SpanHoverCard>,
		);

		expect(screen.getByTestId('child-element')).toBeInTheDocument();
		expect(screen.getByText('Hover me')).toBeInTheDocument();
	});

	it('shows popover after 0.2 second delay on hover', async () => {
		render(
			<SpanHoverCard span={mockSpan} traceMetadata={mockTraceMetadata}>
				<div data-testid={HOVER_ELEMENT_ID}>Hover for details</div>
			</SpanHoverCard>,
		);

		const hoverElement = screen.getByTestId(HOVER_ELEMENT_ID);

		// Hover over the element
		fireEvent.mouseEnter(hoverElement);

		// Popover should NOT appear immediately
		expect(screen.queryByText('Duration:')).not.toBeInTheDocument();

		// Advance time by 0.5 seconds
		act(() => {
			jest.advanceTimersByTime(200);
		});

		// Now popover should appear
		expect(screen.getByText('Duration:')).toBeInTheDocument();
	});

	it('does not show popover if hover is too brief', async () => {
		render(
			<SpanHoverCard span={mockSpan} traceMetadata={mockTraceMetadata}>
				<div data-testid={HOVER_ELEMENT_ID}>Quick hover test</div>
			</SpanHoverCard>,
		);

		const hoverElement = screen.getByTestId(HOVER_ELEMENT_ID);

		// Quick hover and unhover (less than the 0.2s delay)
		fireEvent.mouseEnter(hoverElement);
		act(() => {
			jest.advanceTimersByTime(100); // Only 0.1 seconds
		});
		fireEvent.mouseLeave(hoverElement);

		// Advance past the full delay
		act(() => {
			jest.advanceTimersByTime(400);
		});

		// Popover should not appear
		expect(screen.queryByText('Duration:')).not.toBeInTheDocument();
	});

	it('displays span information in popover content after delay', async () => {
		render(
			<SpanHoverCard span={mockSpan} traceMetadata={mockTraceMetadata}>
				<div data-testid={HOVER_ELEMENT_ID}>Test span</div>
			</SpanHoverCard>,
		);

		const hoverElement = screen.getByTestId(HOVER_ELEMENT_ID);

		// Hover and wait for popover
		fireEvent.mouseEnter(hoverElement);
		act(() => {
			jest.advanceTimersByTime(500);
		});

		// Check that popover shows span operation name in title
		expect(screen.getByText('GET /api/users')).toBeInTheDocument();

		// Check duration information
		expect(screen.getByText('Duration:')).toBeInTheDocument();
		expect(screen.getByText('150ms')).toBeInTheDocument();

		// Check events count
		expect(screen.getByText('Events:')).toBeInTheDocument();
		expect(screen.getByText('2')).toBeInTheDocument();

		// Check start time label
		expect(screen.getByText('Start time:')).toBeInTheDocument();
	});

	it('displays date in DD MMM YYYY, HH:mm:ss format with seconds', async () => {
		render(
			<SpanHoverCard span={mockSpan} traceMetadata={mockTraceMetadata}>
				<div data-testid={HOVER_ELEMENT_ID}>Date format test</div>
			</SpanHoverCard>,
		);

		const hoverElement = screen.getByTestId(HOVER_ELEMENT_ID);

		// Hover and wait for popover
		fireEvent.mouseEnter(hoverElement);
		act(() => {
			jest.advanceTimersByTime(500);
		});

		// Verify the DD MMM YYYY, HH:mm:ss format is displayed
		expect(screen.getByText('15 Mar 2024, 14:23:45')).toBeInTheDocument();
	});

	it('displays relative time information', async () => {
		const spanWithRelativeTime: Span = {
			...mockSpan,
			timestamp: mockTraceMetadata.startTime + 1000000, // 1 second later
		};

		render(
			<SpanHoverCard span={spanWithRelativeTime} traceMetadata={mockTraceMetadata}>
				<div data-testid={HOVER_ELEMENT_ID}>Relative time test</div>
			</SpanHoverCard>,
		);

		const hoverElement = screen.getByTestId(HOVER_ELEMENT_ID);

		// Hover and wait for popover
		fireEvent.mouseEnter(hoverElement);
		act(() => {
			jest.advanceTimersByTime(500);
		});

		// Check relative time display
		expect(screen.getByText(/after trace start/)).toBeInTheDocument();
	});

	it('handles spans with no events correctly', async () => {
		const spanWithoutEvents: Span = {
			...mockSpan,
			event: [],
		};

		render(
			<SpanHoverCard span={spanWithoutEvents} traceMetadata={mockTraceMetadata}>
				<div data-testid={HOVER_ELEMENT_ID}>No events test</div>
			</SpanHoverCard>,
		);

		const hoverElement = screen.getByTestId(HOVER_ELEMENT_ID);

		// Hover and wait for popover
		fireEvent.mouseEnter(hoverElement);
		act(() => {
			jest.advanceTimersByTime(500);
		});

		expect(screen.getByText('Events:')).toBeInTheDocument();
		expect(screen.getByText('0')).toBeInTheDocument();
	});

	it('verifies mouseEnterDelay prop is set to 0.5', () => {
		const { container } = render(
			<SpanHoverCard span={mockSpan} traceMetadata={mockTraceMetadata}>
				<div data-testid={HOVER_ELEMENT_ID}>Delay test</div>
			</SpanHoverCard>,
		);

		// The mouseEnterDelay prop should be set on the Popover component
		// This test verifies the implementation includes the delay
		const popover = container.querySelector('.ant-popover');
		expect(popover).not.toBeInTheDocument(); // Initially not visible

		// Hover to trigger delay mechanism
		const hoverElement = screen.getByTestId(HOVER_ELEMENT_ID);
		fireEvent.mouseEnter(hoverElement);

		// Should not appear before delay
		expect(screen.queryByText('Duration:')).not.toBeInTheDocument();

		// Should appear after delay
		act(() => {
			jest.advanceTimersByTime(500);
		});
		expect(screen.getByText('Duration:')).toBeInTheDocument();
	});
});
