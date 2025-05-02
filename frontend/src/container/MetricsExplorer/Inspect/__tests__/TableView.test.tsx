/* eslint-disable react/jsx-props-no-spreading */
import { render, screen } from '@testing-library/react';
import { InspectMetricsSeries } from 'api/metricsExplorer/getInspectMetricsDetails';

import TableView from '../TableView';
import { InspectionStep } from '../types';
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
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders table with correct columns', () => {
		render(<TableView {...defaultProps} />);
		expect(screen.getByText('Time Series')).toBeInTheDocument();
		expect(screen.getByText('Values')).toBeInTheDocument();
	});

	it('renders time series titles correctly when inspection is completed', () => {
		render(<TableView {...defaultProps} />);
		expect(screen.getByText('Series 1')).toBeInTheDocument();
		expect(screen.getByText('Series 2')).toBeInTheDocument();
	});

	it('renders time series values in correct format', () => {
		render(<TableView {...defaultProps} />);
		const formattedValues = mockTimeSeries.map((series) =>
			series.values
				.map(
					(v) => `(${formatTimestampToFullDateTime(v.timestamp, true)}, ${v.value})`,
				)
				.join(', '),
		);
		formattedValues.forEach((value) => {
			expect(screen.getByText(value, { exact: false })).toBeInTheDocument();
		});
	});

	it('applies correct styling to time series titles', () => {
		render(<TableView {...defaultProps} />);
		const titles = screen.getAllByText(/Series \d/);
		titles.forEach((title, index) => {
			expect(title).toHaveStyle({ color: mockTimeSeries[index].strokeColor });
		});
	});
});
