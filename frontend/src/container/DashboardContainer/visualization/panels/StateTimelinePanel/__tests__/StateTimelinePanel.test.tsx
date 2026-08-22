import React from 'react';
import { render, screen } from '@testing-library/react';

import { LegendPosition } from 'types/api/dashboard/getAll';

import StateTimelinePanel, {
	StateTimelinePanelProps,
} from '../StateTimelinePanel';
import {
	SegmentData,
	SwimLaneModel,
	SwimLaneRowData,
	TimeRange,
} from '../utils/transformData';

// Mock useTimezone provider
jest.mock('providers/Timezone', () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }): JSX.Element => (
		<>{children}</>
	),
	useTimezone: jest.fn().mockReturnValue({
		timezone: { value: 'UTC', offset: 'UTC' },
		formatTimezoneAdjustedTimestamp: jest.fn((ts: string) => ts),
	}),
}));

// Mock react-virtuoso to render all items directly for testing
jest.mock('react-virtuoso', () => ({
	Virtuoso: jest.fn(({ data, itemContent }: any) => (
		<div data-testid="virtuoso">
			{data?.map((item: any, index: number) => (
				<div key={item.label || index} data-testid={`virtuoso-item-${index}`}>
					{itemContent(index, item)}
				</div>
			))}
		</div>
	)),
}));

// ===== Test Helpers =====

const DEFAULT_TIME_RANGE: TimeRange = {
	start: 1700000000,
	end: 1700003600, // 1 hour range
};

function createSegment(overrides: Partial<SegmentData> = {}): SegmentData {
	return {
		startTime: 1700000000,
		endTime: 1700001800,
		value: 1,
		color: '#22c55e',
		thresholdLabel: 'OK',
		...overrides,
	};
}

function createRow(
	label: string,
	segments?: SegmentData[],
): SwimLaneRowData {
	return {
		label,
		segments: segments ?? [
			createSegment({ startTime: 1700000000, endTime: 1700001800 }),
			createSegment({ startTime: 1700001800, endTime: 1700003600 }),
		],
		seriesLabels: { service: label },
	};
}

function createModel(
	rows: SwimLaneRowData[],
	timeRange?: TimeRange,
): SwimLaneModel {
	return {
		rows,
		timeRange: timeRange ?? DEFAULT_TIME_RANGE,
	};
}

function defaultProps(overrides: Partial<StateTimelinePanelProps> = {}): StateTimelinePanelProps {
	return {
		swimLaneModel: createModel([
			createRow('service-a'),
			createRow('service-b'),
			createRow('service-c'),
		]),
		width: 800,
		height: 400,
		isDarkMode: false,
		legendPosition: LegendPosition.BOTTOM,
		...overrides,
	};
}

// ===== Tests =====

describe('StateTimelinePanel', () => {
	it('renders correct number of swim-lane rows for given data', () => {
		const rows = [
			createRow('alpha'),
			createRow('beta'),
			createRow('gamma'),
			createRow('delta'),
		];
		const props = defaultProps({
			swimLaneModel: createModel(rows),
		});

		render(<StateTimelinePanel {...props} />);

		expect(screen.getByTestId('state-timeline-panel')).toBeInTheDocument();
		// Each row is rendered as a virtuoso item
		expect(screen.getByTestId('virtuoso-item-0')).toBeInTheDocument();
		expect(screen.getByTestId('virtuoso-item-1')).toBeInTheDocument();
		expect(screen.getByTestId('virtuoso-item-2')).toBeInTheDocument();
		expect(screen.getByTestId('virtuoso-item-3')).toBeInTheDocument();
		expect(screen.queryByTestId('virtuoso-item-4')).not.toBeInTheDocument();
	});

	it('shows "No Data" message when series array is empty', () => {
		const props = defaultProps({
			swimLaneModel: createModel([]),
		});

		render(<StateTimelinePanel {...props} />);

		expect(screen.getByTestId('state-timeline-no-data')).toBeInTheDocument();
		expect(screen.getByText('No Data')).toBeInTheDocument();
		// Virtuoso should NOT render
		expect(screen.queryByTestId('virtuoso')).not.toBeInTheDocument();
	});

	it('shows warning when > 100 series', () => {
		const rows = Array.from({ length: 101 }, (_, i) =>
			createRow(`service-${String(i).padStart(3, '0')}`),
		);
		const props = defaultProps({
			swimLaneModel: createModel(rows),
		});

		render(<StateTimelinePanel {...props} />);

		expect(screen.getByTestId('state-timeline-warning')).toBeInTheDocument();
		expect(
			screen.getByText(/Too many series/),
		).toBeInTheDocument();
	});

	it('does not show warning when exactly 100 series', () => {
		const rows = Array.from({ length: 100 }, (_, i) =>
			createRow(`service-${String(i).padStart(3, '0')}`),
		);
		const props = defaultProps({
			swimLaneModel: createModel(rows),
		});

		render(<StateTimelinePanel {...props} />);

		expect(
			screen.queryByTestId('state-timeline-warning'),
		).not.toBeInTheDocument();
	});

	it('applies dark mode class when isDarkMode is true', () => {
		const props = defaultProps({ isDarkMode: true });

		render(<StateTimelinePanel {...props} />);

		const panel = screen.getByTestId('state-timeline-panel');
		expect(panel.className).toContain('state-timeline-panel--dark');
		expect(panel.className).not.toContain('state-timeline-panel--light');
	});

	it('applies light mode class when isDarkMode is false', () => {
		const props = defaultProps({ isDarkMode: false });

		render(<StateTimelinePanel {...props} />);

		const panel = screen.getByTestId('state-timeline-panel');
		expect(panel.className).toContain('state-timeline-panel--light');
		expect(panel.className).not.toContain('state-timeline-panel--dark');
	});

	it('single data point renders full-width segment', () => {
		const timeRange: TimeRange = { start: 1700000000, end: 1700003600 };
		// A single data point produces one segment spanning the full time range
		const singleSegment = createSegment({
			startTime: timeRange.start,
			endTime: timeRange.end,
			value: 42,
			color: '#ef4444',
		});
		const rows = [createRow('single-point-service', [singleSegment])];
		const props = defaultProps({
			swimLaneModel: createModel(rows, timeRange),
		});

		render(<StateTimelinePanel {...props} />);

		// The row should render with exactly one segment
		const virtuosoItem = screen.getByTestId('virtuoso-item-0');
		expect(virtuosoItem).toBeInTheDocument();

		// The segment's width should span the full width.
		// Since the segment spans the entire timeRange, its calculated width
		// equals totalWidth (segmentDuration / totalDuration * totalWidth = 1 * width).
		// We verify the segment div has the expected backgroundColor style.
		const segmentDiv = virtuosoItem.querySelector(
			'[style*="background-color"]',
		);
		expect(segmentDiv).not.toBeNull();
		// Check that the segment spans the full width (800px from props)
		expect((segmentDiv as HTMLElement).style.width).toBe('800px');
	});
});
