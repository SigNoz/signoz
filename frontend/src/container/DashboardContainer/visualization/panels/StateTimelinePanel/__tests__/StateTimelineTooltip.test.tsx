import { render, screen } from '@testing-library/react';

import StateTimelineTooltip, {
	StateTimelineTooltipProps,
} from '../StateTimelineTooltip';
import { SegmentData } from '../utils/transformData';

// Requirements: 6.1, 6.2, 6.4, 6.6

describe('StateTimelineTooltip', () => {
	const baseSegment: SegmentData = {
		startTime: 1700000000, // 2023-11-14 22:13:20 UTC
		endTime: 1700000300, // 5 minutes later
		value: 42,
		color: '#22C55E',
		thresholdLabel: 'Healthy',
	};

	const defaultProps: StateTimelineTooltipProps = {
		visible: true,
		x: 100,
		y: 50,
		segment: baseSegment,
		rowLabel: 'service-alpha',
		panelWidth: 800,
		panelHeight: 400,
		timezone: 'UTC',
	};

	describe('tooltip appears on segment hover with correct content fields', () => {
		it('renders tooltip with data-testid when visible and segment is provided', () => {
			render(<StateTimelineTooltip {...defaultProps} />);

			const tooltip = screen.getByTestId('state-timeline-tooltip');
			expect(tooltip).toBeInTheDocument();
		});

		it('displays opacity 1 when visible is true', () => {
			render(<StateTimelineTooltip {...defaultProps} visible />);

			const tooltip = screen.getByTestId('state-timeline-tooltip');
			expect(tooltip).toHaveStyle({ opacity: 1 });
		});

		it('displays the series label', () => {
			render(<StateTimelineTooltip {...defaultProps} />);

			expect(screen.getByText('service-alpha')).toBeInTheDocument();
		});

		it('displays the raw numeric value', () => {
			render(<StateTimelineTooltip {...defaultProps} />);

			expect(screen.getByText('42')).toBeInTheDocument();
		});

		it('displays the threshold label when present', () => {
			render(<StateTimelineTooltip {...defaultProps} />);

			expect(screen.getByText('Healthy')).toBeInTheDocument();
			expect(screen.getByText('State:')).toBeInTheDocument();
		});

		it('displays the duration of the segment', () => {
			render(<StateTimelineTooltip {...defaultProps} />);

			// 300 seconds = 5 minutes
			expect(screen.getByText('5m')).toBeInTheDocument();
		});

		it('displays the formatted timestamp', () => {
			render(<StateTimelineTooltip {...defaultProps} />);

			// 1700000000 in UTC → Nov 14, 2023 22:13:20
			expect(screen.getByText('Nov 14, 2023 22:13:20')).toBeInTheDocument();
		});

		it('displays the "Series:" label', () => {
			render(<StateTimelineTooltip {...defaultProps} />);

			expect(screen.getByText('Series:')).toBeInTheDocument();
		});

		it('displays the "Value:" label', () => {
			render(<StateTimelineTooltip {...defaultProps} />);

			expect(screen.getByText('Value:')).toBeInTheDocument();
		});

		it('displays the "Duration:" label', () => {
			render(<StateTimelineTooltip {...defaultProps} />);

			expect(screen.getByText('Duration:')).toBeInTheDocument();
		});
	});

	describe('tooltip disappears on mouse leave', () => {
		it('displays opacity 0 when visible is false', () => {
			render(<StateTimelineTooltip {...defaultProps} visible={false} />);

			const tooltip = screen.getByTestId('state-timeline-tooltip');
			expect(tooltip).toHaveStyle({ opacity: 0 });
		});

		it('returns null when segment is null', () => {
			const { container } = render(
				<StateTimelineTooltip {...defaultProps} segment={null} />,
			);

			expect(
				container.querySelector('[data-testid="state-timeline-tooltip"]'),
			).not.toBeInTheDocument();
		});
	});

	describe('tooltip shows raw value without label when no threshold matches', () => {
		it('does not render "State:" row when thresholdLabel is undefined', () => {
			const segmentNoThreshold: SegmentData = {
				startTime: 1700000000,
				endTime: 1700000600,
				value: 99,
				color: '#9CA3AF',
				thresholdLabel: undefined,
			};

			render(
				<StateTimelineTooltip
					{...defaultProps}
					segment={segmentNoThreshold}
				/>,
			);

			expect(screen.queryByText('State:')).not.toBeInTheDocument();
			expect(screen.getByText('99')).toBeInTheDocument();
		});

		it('displays em-dash when value is null', () => {
			const segmentNullValue: SegmentData = {
				startTime: 1700000000,
				endTime: 1700000060,
				value: null,
				color: '#9CA3AF',
				thresholdLabel: undefined,
			};

			render(
				<StateTimelineTooltip
					{...defaultProps}
					segment={segmentNullValue}
				/>,
			);

			expect(screen.queryByText('State:')).not.toBeInTheDocument();
			expect(screen.getByText('—')).toBeInTheDocument();
		});

		it('displays raw value and threshold label simultaneously when threshold matches', () => {
			const segmentWithThreshold: SegmentData = {
				startTime: 1700000000,
				endTime: 1700000120,
				value: 1,
				color: '#EF4444',
				thresholdLabel: 'Critical',
			};

			render(
				<StateTimelineTooltip
					{...defaultProps}
					segment={segmentWithThreshold}
				/>,
			);

			expect(screen.getByText('1')).toBeInTheDocument();
			expect(screen.getByText('Critical')).toBeInTheDocument();
			expect(screen.getByText('State:')).toBeInTheDocument();
		});
	});
});
