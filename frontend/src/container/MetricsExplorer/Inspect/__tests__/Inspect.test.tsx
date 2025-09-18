/* eslint-disable react/jsx-props-no-spreading */

import { render, screen } from '@testing-library/react';
import { InspectMetricsSeries } from 'api/metricsExplorer/getInspectMetricsDetails';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import * as useInspectMetricsHooks from 'hooks/metricsExplorer/useGetInspectMetricsDetails';
import * as useGetMetricDetailsHooks from 'hooks/metricsExplorer/useGetMetricDetails';
import * as appContextHooks from 'providers/App/App';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import store from 'store';

import ROUTES from '../../../../constants/routes';
import { LicenseEvent } from '../../../../types/api/licensesV3/getActive';
import Inspect from '../Inspect';
import { InspectionStep } from '../types';

const queryClient = new QueryClient();
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

jest.spyOn(useGetMetricDetailsHooks, 'useGetMetricDetails').mockReturnValue({
	data: {
		metricDetails: {
			metricName: 'test_metric',
			metricType: MetricType.GAUGE,
		},
	},
} as any);

jest
	.spyOn(useInspectMetricsHooks, 'useGetInspectMetricsDetails')
	.mockReturnValue({
		data: {
			payload: {
				data: {
					series: mockTimeSeries,
				},
				status: 'success',
			},
		},
		isLoading: false,
	} as any);

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${ROUTES.METRICS_EXPLORER_BASE}`,
	}),
}));

const mockResizeObserver = jest.fn();
mockResizeObserver.mockImplementation(() => ({
	observe: (): void => undefined,
	unobserve: (): void => undefined,
	disconnect: (): void => undefined,
}));
window.ResizeObserver = mockResizeObserver;

describe('Inspect', () => {
	const defaultProps = {
		inspectMetricsTimeSeries: mockTimeSeries,
		formattedInspectMetricsTimeSeries: [],
		metricUnit: '',
		metricName: 'test_metric',
		metricType: MetricType.GAUGE,
		spaceAggregationSeriesMap: new Map(),
		inspectionStep: InspectionStep.COMPLETED,
		resetInspection: jest.fn(),
		isOpen: true,
		onClose: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders all components', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<Inspect {...defaultProps} />
				</Provider>
			</QueryClientProvider>,
		);

		expect(screen.getByText('test_metric')).toBeInTheDocument();
		expect(screen.getByRole('switch')).toBeInTheDocument(); // Graph/Table view switch
		expect(screen.getByText('Query Builder')).toBeInTheDocument();
	});

	it('renders loading state', () => {
		jest
			.spyOn(useInspectMetricsHooks, 'useGetInspectMetricsDetails')
			.mockReturnValue({
				data: {
					payload: {
						data: {
							series: [],
						},
					},
				},
				isLoading: true,
			} as any);
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<Inspect {...defaultProps} />
				</Provider>
			</QueryClientProvider>,
		);

		expect(screen.getByTestId('inspect-metrics-loading')).toBeInTheDocument();
	});

	it('renders empty state', () => {
		jest
			.spyOn(useInspectMetricsHooks, 'useGetInspectMetricsDetails')
			.mockReturnValue({
				data: {
					payload: {
						data: {
							series: [],
						},
					},
				},
				isLoading: false,
			} as any);
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<Inspect {...defaultProps} />
				</Provider>
			</QueryClientProvider>,
		);

		expect(screen.getByTestId('inspect-metrics-empty')).toBeInTheDocument();
	});

	it('renders error state', () => {
		jest
			.spyOn(useInspectMetricsHooks, 'useGetInspectMetricsDetails')
			.mockReturnValue({
				data: {
					payload: {
						data: {
							series: [],
						},
					},
				},
				isLoading: false,
				isError: true,
			} as any);
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<Inspect {...defaultProps} />
				</Provider>
			</QueryClientProvider>,
		);

		expect(screen.getByTestId('inspect-metrics-error')).toBeInTheDocument();
	});

	it('renders error state with 400 status code', () => {
		jest
			.spyOn(useInspectMetricsHooks, 'useGetInspectMetricsDetails')
			.mockReturnValue({
				data: {
					statusCode: 400,
				},
				isError: false,
			} as any);
		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<Inspect {...defaultProps} />
				</Provider>
			</QueryClientProvider>,
		);

		expect(screen.getByTestId('inspect-metrics-error')).toBeInTheDocument();
	});
});
