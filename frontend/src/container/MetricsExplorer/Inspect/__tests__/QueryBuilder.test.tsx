/* eslint-disable react/jsx-props-no-spreading */
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { fireEvent, render, screen } from '@testing-library/react';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import * as appContextHooks from 'providers/App/App';
import store from 'store';

import ROUTES from '../../../../constants/routes';
import { LicenseEvent } from '../../../../types/api/licensesV3/getActive';
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

jest.mock('container/QueryBuilder/filters', () => ({
	AggregatorFilter: ({ onSelect, onChange, defaultValue }: any): JSX.Element => (
		<div data-testid="mock-aggregator-filter">
			<input
				data-testid="metric-name-input"
				defaultValue={defaultValue}
				onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
					onChange({ key: e.target.value })
				}
			/>
			<button
				type="button"
				data-testid="select-metric-button"
				onClick={(): void => onSelect({ key: 'test_metric_2' })}
			>
				Select Metric
			</button>
		</div>
	),
}));

jest.spyOn(appContextHooks, 'useAppContext').mockReturnValue({
	user: {
		role: 'admin',
	},
	activeLicenseV3: {
		event_queue: {
			created_at: '0',
			event: LicenseEvent.NO_EVENT,
			scheduled_at: '0',
			status: '',
			updated_at: '0',
		},
		license: {
			license_key: 'test-license-key',
			license_type: 'trial',
			org_id: 'test-org-id',
			plan_id: 'test-plan-id',
			plan_name: 'test-plan-name',
			plan_type: 'trial',
			plan_version: 'test-plan-version',
		},
	},
} as any);

const queryClient = new QueryClient();

const mockSetCurrentMetricName = jest.fn();
const mockSetAppliedMetricName = jest.fn();

describe('QueryBuilder', () => {
	const defaultProps = {
		currentMetricName: 'test_metric',
		setCurrentMetricName: mockSetCurrentMetricName,
		setAppliedMetricName: mockSetAppliedMetricName,
		spaceAggregationLabels: ['label1', 'label2'],
		currentMetricInspectionOptions: {
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
		currentQuery: {
			filters: {
				items: [],
				op: 'and',
			},
		} as any,
		setCurrentQuery: jest.fn(),
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

	it('should call setCurrentMetricName when metric name is selected', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<QueryBuilder {...defaultProps} />
				</Provider>
			</QueryClientProvider>,
		);

		const metricNameSearch = screen.getByTestId('metric-name-search');
		expect(metricNameSearch).toBeInTheDocument();

		expect(screen.getByText('From')).toBeInTheDocument();

		const selectButton = screen.getByTestId('select-metric-button');
		fireEvent.click(selectButton);

		expect(mockSetCurrentMetricName).toHaveBeenCalledWith('test_metric_2');
	});

	it('should call setAppliedMetricName when query is applied', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<QueryBuilder {...defaultProps} />
				</Provider>
			</QueryClientProvider>,
		);

		const applyQueryButton = screen.getByTestId('apply-query-button');
		fireEvent.click(applyQueryButton);

		expect(mockSetCurrentMetricName).toHaveBeenCalledTimes(0);
		expect(mockSetAppliedMetricName).toHaveBeenCalledWith('test_metric');
	});

	it('should apply inspect options when query is applied', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<QueryBuilder {...defaultProps} />
				</Provider>
			</QueryClientProvider>,
		);

		const applyQueryButton = screen.getByTestId('apply-query-button');
		fireEvent.click(applyQueryButton);

		expect(defaultProps.dispatchMetricInspectionOptions).toHaveBeenCalledWith({
			type: 'APPLY_INSPECTION_OPTIONS',
		});
	});
});
