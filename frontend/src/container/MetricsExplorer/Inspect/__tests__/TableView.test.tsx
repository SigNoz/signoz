/* eslint-disable react/jsx-props-no-spreading */
import { render, screen } from '@testing-library/react';
import { InspectMetricsSeries } from 'api/metricsExplorer/getInspectMetricsDetails';

import TableView from '../TableView';
import {
	InspectionStep,
	SpaceAggregationOptions,
	TimeAggregationOptions,
} from '../types';
import { formatTimestampToFullDateTime } from '../utils';

describe('TableView', () => {
	const mockTimeSeries: InspectMetricsSeries[] = [
		{
			strokeColor: '#000',
			title: 'Series 1',
			values: [
				{ timestamp: 1234567890000, value: '10' },
				{ timestamp: 1234567891000, value: '20' },
			],
			labels: { label1: 'value1' },
			labelsArray: [
				{
					label: 'label1',
					value: 'value1',
				},
			],
		},
		{
			strokeColor: '#fff',
			title: 'Series 2',
			values: [
				{ timestamp: 1234567890000, value: '30' },
				{ timestamp: 1234567891000, value: '40' },
			],
			labels: { label2: 'value2' },
			labelsArray: [
				{
					label: 'label2',
					value: 'value2',
				},
			],
		},
	];

	const defaultProps = {
		inspectionStep: InspectionStep.COMPLETED,
		inspectMetricsTimeSeries: mockTimeSeries,
		setShowExpandedView: jest.fn(),
		setExpandedViewOptions: jest.fn(),
		metricInspectionOptions: {
			timeAggregationInterval: 60,
			timeAggregationOption: TimeAggregationOptions.MAX,
			spaceAggregationOption: SpaceAggregationOptions.MAX_BY,
			spaceAggregationLabels: ['host_name'],
			filters: {
				items: [],
				op: 'AND',
			},
		},
		isInspectMetricsRefetching: false,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders table with correct columns', () => {
		render(<TableView {...defaultProps} />);
		expect(screen.getByText('label1')).toBeInTheDocument();
		expect(screen.getByText('value1')).toBeInTheDocument();
		expect(screen.getByText('Values')).toBeInTheDocument();
	});

	it('renders time series titles correctly when inspection is completed', () => {
		render(<TableView {...defaultProps} />);
		expect(screen.getByText('label1')).toBeInTheDocument();
		expect(screen.getByText('value1')).toBeInTheDocument();
	});

	it('renders time series values in correct format', () => {
		render(<TableView {...defaultProps} />);
		const formattedValues = mockTimeSeries.map(
			(series) =>
				series.values.map(
					(v) => `(${formatTimestampToFullDateTime(v.timestamp, true)}, ${v.value})`,
				)[0],
		);
		formattedValues.forEach((value) => {
			expect(screen.getByText(value, { exact: false })).toBeInTheDocument();
		});
	});

	it('applies correct styling to time series titles', () => {
		render(<TableView {...defaultProps} />);
		const titles = screen.getByText('value1');
		expect(titles).toHaveStyle({ color: mockTimeSeries[0].strokeColor });
	});
});
