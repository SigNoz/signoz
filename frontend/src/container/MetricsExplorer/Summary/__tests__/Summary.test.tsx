import { MetricType } from 'api/metricsExplorer/getMetricsList';
import ROUTES from 'constants/routes';
import * as useGetMetricsListHooks from 'hooks/metricsExplorer/useGetMetricsList';
import * as useGetMetricsTreeMapHooks from 'hooks/metricsExplorer/useGetMetricsTreeMap';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { useSearchParams } from 'react-router-dom-v5-compat';
import store from 'store';
import { render, screen } from 'tests/test-utils';

import Summary from '../Summary';
import { TreemapViewType } from '../types';

jest.mock('d3-hierarchy', () => ({
	stratify: jest.fn().mockReturnValue({
		id: jest.fn().mockReturnValue({
			parentId: jest.fn().mockReturnValue(
				jest.fn().mockReturnValue({
					sum: jest.fn().mockReturnValue({
						descendants: jest.fn().mockReturnValue([]),
						eachBefore: jest.fn().mockReturnValue([]),
					}),
				}),
			),
		}),
	}),
	treemapBinary: jest.fn(),
}));
jest.mock('react-use', () => ({
	useWindowSize: jest.fn().mockReturnValue({ width: 1000, height: 1000 }),
}));
jest.mock('react-router-dom-v5-compat', () => {
	const actual = jest.requireActual('react-router-dom-v5-compat');
	return {
		...actual,
		useSearchParams: jest.fn(),
		useNavigationType: (): any => 'PUSH',
	};
});
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${ROUTES.METRICS_EXPLORER_BASE}`,
	}),
}));

const queryClient = new QueryClient();
const mockMetricName = 'test-metric';
jest.spyOn(useGetMetricsListHooks, 'useGetMetricsList').mockReturnValue({
	data: {
		payload: {
			status: 'success',
			data: {
				metrics: [
					{
						metric_name: mockMetricName,
						description: 'description for a test metric',
						type: MetricType.GAUGE,
						unit: 'count',
						lastReceived: '1715702400',
						[TreemapViewType.TIMESERIES]: 100,
						[TreemapViewType.SAMPLES]: 100,
					},
				],
			},
		},
	},
	isError: false,
	isLoading: false,
} as any);
jest.spyOn(useGetMetricsTreeMapHooks, 'useGetMetricsTreeMap').mockReturnValue({
	data: {
		payload: {
			status: 'success',
			data: {
				[TreemapViewType.TIMESERIES]: [
					{
						metric_name: mockMetricName,
						percentage: 100,
						total_value: 100,
					},
				],
				[TreemapViewType.SAMPLES]: [
					{
						metric_name: mockMetricName,
						percentage: 100,
					},
				],
			},
		},
	},
	isError: false,
	isLoading: false,
} as any);
const mockSetSearchParams = jest.fn();

describe('Summary', () => {
	it('persists inspect modal open state across page refresh', () => {
		(useSearchParams as jest.Mock).mockReturnValue([
			new URLSearchParams({
				isInspectModalOpen: 'true',
				selectedMetricName: 'test-metric',
			}),
			mockSetSearchParams,
		]);

		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<Summary />
				</Provider>
			</QueryClientProvider>,
		);

		expect(screen.queryByText('Proportion View')).not.toBeInTheDocument();
	});

	it('persists metric details modal state across page refresh', () => {
		(useSearchParams as jest.Mock).mockReturnValue([
			new URLSearchParams({
				isMetricDetailsOpen: 'true',
				selectedMetricName: mockMetricName,
			}),
			mockSetSearchParams,
		]);

		render(
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<Summary />
				</Provider>
			</QueryClientProvider>,
		);

		expect(screen.queryByText('Proportion View')).not.toBeInTheDocument();
	});
});
