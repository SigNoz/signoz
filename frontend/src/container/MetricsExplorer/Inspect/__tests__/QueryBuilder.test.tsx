/* eslint-disable react/jsx-props-no-spreading */
import { render, screen } from '@testing-library/react';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import store from 'store';

import ROUTES from '../../../../constants/routes';
import QueryBuilder from '../QueryBuilder';
import {
	InspectionStep,
	SpaceAggregationOptions,
	TimeAggregationOptions,
} from '../types';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${ROUTES.METRICS_EXPLORER_BASE}`,
	}),
}));

const queryClient = new QueryClient();

describe('QueryBuilder', () => {
	const defaultProps = {
		metricName: 'test_metric',
		setMetricName: jest.fn(),
		spaceAggregationLabels: ['label1', 'label2'],
		metricInspectionOptions: {
			timeAggregationInterval: 60,
			timeAggregationOption: TimeAggregationOptions.AVG,
			spaceAggregationLabels: [],
			spaceAggregationOption: SpaceAggregationOptions.AVG_BY,
			filters: {
				items: [],
				op: 'and',
			},
		},
		dispatchMetricInspectionOptions: jest.fn(),
		metricType: MetricType.SUM,
		inspectionStep: InspectionStep.TIME_AGGREGATION,
		inspectMetricsTimeSeries: [],
		searchQuery: {
			filters: {
				items: [],
				op: 'and',
			},
		} as any,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders query builder header', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<QueryBuilder {...defaultProps} />
				</Provider>
			</QueryClientProvider>,
		);
		expect(screen.getByText('Query Builder')).toBeInTheDocument();
	});

	it('renders metric name search component', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<QueryBuilder {...defaultProps} />
				</Provider>
			</QueryClientProvider>,
		);
		expect(screen.getByTestId('metric-name-search')).toBeInTheDocument();
	});

	it('renders metric filters component', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<QueryBuilder {...defaultProps} />
				</Provider>
			</QueryClientProvider>,
		);
		expect(screen.getByTestId('metric-filters')).toBeInTheDocument();
	});

	it('renders time aggregation component', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<QueryBuilder {...defaultProps} />
				</Provider>
			</QueryClientProvider>,
		);
		expect(screen.getByTestId('metric-time-aggregation')).toBeInTheDocument();
	});

	it('renders space aggregation component', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<QueryBuilder {...defaultProps} />
				</Provider>
			</QueryClientProvider>,
		);
		expect(screen.getByTestId('metric-space-aggregation')).toBeInTheDocument();
	});
});
