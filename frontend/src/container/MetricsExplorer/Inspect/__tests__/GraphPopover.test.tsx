import { fireEvent, render, screen } from '@testing-library/react';
import { InspectMetricsSeries } from 'api/metricsExplorer/getInspectMetricsDetails';

import GraphPopover from '../GraphPopover';
import { GraphPopoverOptions, InspectionStep } from '../types';

describe('GraphPopover', () => {
	const mockOptions: GraphPopoverOptions = {
		x: 100,
		y: 100,
		value: 42.123,
		timestamp: 1672531200000,
		timeSeries: {
			values: [
				{ timestamp: 1672531200000, value: '42.123' },
				{ timestamp: 1672531260000, value: '43.456' },
			],
			labels: {},
			labelsArray: [],
		},
	};
	const mockSpaceAggregationSeriesMap: Map<
		string,
		InspectMetricsSeries[]
	> = new Map();

	const mockOpenInExpandedView = jest.fn();
	const mockStep = InspectionStep.TIME_AGGREGATION;

	it('renders with correct values', () => {
		render(
			<GraphPopover
				options={mockOptions}
				popoverRef={{ current: null }}
				openInExpandedView={mockOpenInExpandedView}
				spaceAggregationSeriesMap={mockSpaceAggregationSeriesMap}
				step={mockStep}
			/>,
		);

		// Check value is rendered with 2 decimal places
		expect(screen.getByText('42.12')).toBeInTheDocument();
	});

	it('opens the expanded view when button is clicked', () => {
		render(
			<GraphPopover
				options={mockOptions}
				popoverRef={{ current: null }}
				openInExpandedView={mockOpenInExpandedView}
				spaceAggregationSeriesMap={mockSpaceAggregationSeriesMap}
				step={mockStep}
			/>,
		);

		const button = screen.getByText('View details');
		fireEvent.click(button);

		expect(mockOpenInExpandedView).toHaveBeenCalledTimes(1);
	});

	it('finds closest timestamp and value from timeSeries', () => {
		const optionsWithOffset: GraphPopoverOptions = {
			...mockOptions,
			timestamp: 1672531230000,
			value: 42.24,
		};

		render(
			<GraphPopover
				options={optionsWithOffset}
				popoverRef={{ current: null }}
				openInExpandedView={mockOpenInExpandedView}
				spaceAggregationSeriesMap={mockSpaceAggregationSeriesMap}
				step={mockStep}
			/>,
		);

		// Should show the closest value
		expect(screen.getByText('43.46')).toBeInTheDocument();
	});
});
