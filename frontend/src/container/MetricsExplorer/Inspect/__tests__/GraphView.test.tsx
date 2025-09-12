/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable react/jsx-props-no-spreading */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InspectMetricsSeries } from 'api/metricsExplorer/getInspectMetricsDetails';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import { Provider } from 'react-redux';
import store from 'store';
import { AlignedData } from 'uplot';

import GraphView from '../GraphView';
import {
	InspectionStep,
	SpaceAggregationOptions,
	TimeAggregationOptions,
} from '../types';

const mockResizeObserver = jest.fn();
mockResizeObserver.mockImplementation(() => ({
	observe: (): void => undefined,
	unobserve: (): void => undefined,
	disconnect: (): void => undefined,
}));
window.ResizeObserver = mockResizeObserver;

describe('GraphView', () => {
	const mockTimeSeries: InspectMetricsSeries[] = [
		{
			strokeColor: '#000',
			title: 'Series 1',
			values: [
				{ timestamp: 1234567890000, value: '10' },
				{ timestamp: 1234567891000, value: '20' },
			],
			labels: { label1: 'value1' },
			labelsArray: [{ label: 'label1', value: 'value1' }],
		},
	];

	const defaultProps = {
		inspectMetricsTimeSeries: mockTimeSeries,
		formattedInspectMetricsTimeSeries: [
			[1, 2],
			[1, 2],
		] as AlignedData,
		metricUnit: '',
		metricName: 'test_metric',
		metricType: MetricType.GAUGE,
		spaceAggregationSeriesMap: new Map(),
		inspectionStep: InspectionStep.COMPLETED,
		setPopoverOptions: jest.fn(),
		popoverOptions: null,
		setShowExpandedView: jest.fn(),
		setExpandedViewOptions: jest.fn(),
		resetInspection: jest.fn(),
		showExpandedView: false,
		metricInspectionOptions: {
			timeAggregationInterval: 60,
			spaceAggregationOption: SpaceAggregationOptions.MAX_BY,
			spaceAggregationLabels: ['host_name'],
			timeAggregationOption: TimeAggregationOptions.MAX,
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

	it('renders graph view by default', () => {
		render(
			<Provider store={store}>
				<GraphView {...defaultProps} />
			</Provider>,
		);
		expect(screen.getByRole('switch')).toBeInTheDocument();
		expect(screen.getByText('Graph View')).toBeInTheDocument();
	});

	it('switches between graph and table view', async () => {
		render(
			<Provider store={store}>
				<GraphView {...defaultProps} />
			</Provider>,
		);

		const switchButton = screen.getByRole('switch');
		expect(screen.getByText('Graph View')).toBeInTheDocument();

		await userEvent.click(switchButton);
		expect(screen.getByText('Table View')).toBeInTheDocument();
	});

	it('renders metric name and number of series', () => {
		render(
			<Provider store={store}>
				<GraphView {...defaultProps} />
			</Provider>,
		);
		expect(screen.getByText('test_metric')).toBeInTheDocument();
		expect(screen.getByText('1 time series')).toBeInTheDocument();
	});
});
