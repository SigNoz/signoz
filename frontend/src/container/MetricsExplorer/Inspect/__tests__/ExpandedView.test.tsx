/* eslint-disable sonarjs/no-duplicate-string */
import { render, screen } from '@testing-library/react';
import { InspectMetricsSeries } from 'api/metricsExplorer/getInspectMetricsDetails';

import {
	SPACE_AGGREGATION_OPTIONS_FOR_EXPANDED_VIEW,
	TIME_AGGREGATION_OPTIONS,
} from '../constants';
import ExpandedView from '../ExpandedView';
import {
	GraphPopoverData,
	InspectionStep,
	MetricInspectionOptions,
	SpaceAggregationOptions,
	TimeAggregationOptions,
} from '../types';

describe('ExpandedView', () => {
	const mockTimeSeries: InspectMetricsSeries = {
		values: [
			{ timestamp: 1672531200000, value: '42.123' },
			{ timestamp: 1672531260000, value: '43.456' },
			{ timestamp: 1672531320000, value: '44.789' },
			{ timestamp: 1672531380000, value: '45.012' },
		],
		labels: {
			host_id: 'test-id',
		},
		labelsArray: [],
		title: 'TS1',
	};

	const mockOptions = {
		x: 100,
		y: 100,
		value: 42.123,
		timestamp: 1672531200000,
		timeSeries: mockTimeSeries,
	};

	const mockSpaceAggregationSeriesMap = new Map<string, InspectMetricsSeries[]>([
		['host_id:test-id', [mockTimeSeries]],
	]);

	const mockTimeAggregatedSeriesMap = new Map<number, GraphPopoverData[]>([
		[
			1672531200000,
			[
				{
					value: '42.123',
					type: 'instance',
					timestamp: 1672531200000,
					title: 'TS1',
				},
				{
					value: '43.456',
					type: 'instance',
					timestamp: 1672531260000,
					title: 'TS1',
				},
			],
		],
	]);

	const mockMetricInspectionOptions: MetricInspectionOptions = {
		timeAggregationOption: TimeAggregationOptions.MAX,
		timeAggregationInterval: 60,
		spaceAggregationOption: SpaceAggregationOptions.MAX_BY,
		spaceAggregationLabels: ['host_name'],
		filters: {
			items: [],
			op: 'AND',
		},
	};

	it('renders entire time series for a raw data inspection', () => {
		render(
			<ExpandedView
				options={mockOptions}
				spaceAggregationSeriesMap={mockSpaceAggregationSeriesMap}
				step={InspectionStep.TIME_AGGREGATION}
				metricInspectionOptions={mockMetricInspectionOptions}
				timeAggregatedSeriesMap={mockTimeAggregatedSeriesMap}
			/>,
		);
		const graphPopoverCells = screen.getAllByTestId('graph-popover-cell');
		expect(graphPopoverCells).toHaveLength(mockTimeSeries.values.length * 2);

		expect(screen.getAllByText('42.123')).toHaveLength(2);
	});

	it('renders correct split data for a time aggregation inspection', () => {
		const TIME_AGGREGATION_INTERVAL = 120;
		render(
			<ExpandedView
				options={mockOptions}
				spaceAggregationSeriesMap={mockSpaceAggregationSeriesMap}
				step={InspectionStep.SPACE_AGGREGATION}
				metricInspectionOptions={{
					...mockMetricInspectionOptions,
					timeAggregationInterval: TIME_AGGREGATION_INTERVAL,
				}}
				timeAggregatedSeriesMap={mockTimeAggregatedSeriesMap}
			/>,
		);
		// time series by default has values at 60 seconds
		// by doing time aggregation at 120 seconds, we should have 2 values
		const graphPopoverCells = screen.getAllByTestId('graph-popover-cell');
		expect(graphPopoverCells).toHaveLength((TIME_AGGREGATION_INTERVAL / 60) * 2);

		expect(
			screen.getByText(
				`42.123 is the ${
					TIME_AGGREGATION_OPTIONS[
						mockMetricInspectionOptions.timeAggregationOption as TimeAggregationOptions
					]
				} of`,
			),
		);
		expect(screen.getByText('42.123')).toBeInTheDocument();
		expect(screen.getByText('43.456')).toBeInTheDocument();
	});

	it('renders all child time series for a space aggregation inspection', () => {
		render(
			<ExpandedView
				options={mockOptions}
				spaceAggregationSeriesMap={mockSpaceAggregationSeriesMap}
				step={InspectionStep.COMPLETED}
				metricInspectionOptions={mockMetricInspectionOptions}
				timeAggregatedSeriesMap={mockTimeAggregatedSeriesMap}
			/>,
		);
		const graphPopoverCells = screen.getAllByTestId('graph-popover-cell');
		expect(graphPopoverCells).toHaveLength(
			mockSpaceAggregationSeriesMap.size * 2,
		);
		expect(
			screen.getByText(
				`42.123 is the ${
					SPACE_AGGREGATION_OPTIONS_FOR_EXPANDED_VIEW[
						mockMetricInspectionOptions.spaceAggregationOption as SpaceAggregationOptions
					]
				} of`,
			),
		).toBeInTheDocument();
		expect(screen.getByText('TS1')).toBeInTheDocument();
	});

	it('renders all labels for the selected time series', () => {
		render(
			<ExpandedView
				options={mockOptions}
				spaceAggregationSeriesMap={mockSpaceAggregationSeriesMap}
				step={InspectionStep.TIME_AGGREGATION}
				metricInspectionOptions={mockMetricInspectionOptions}
				timeAggregatedSeriesMap={mockTimeAggregatedSeriesMap}
			/>,
		);
		expect(
			screen.getByText(`${mockTimeSeries.title} Labels`),
		).toBeInTheDocument();
		expect(screen.getByText('host_id')).toBeInTheDocument();
		expect(screen.getByText('test-id')).toBeInTheDocument();
	});
});
