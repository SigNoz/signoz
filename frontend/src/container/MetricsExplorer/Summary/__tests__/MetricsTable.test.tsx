// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import * as metricsGeneratedAPI from 'api/generated/services/metrics';
import { Filter } from 'api/v5/v5';
import * as useQueryBuilderOperationsHooks from 'hooks/queryBuilder/useQueryBuilderOperations';
import store from 'store';
import APIError from 'types/api/error';

import MetricsTable from '../MetricsTable';
import { MetricsListItemRowData } from '../types';

const mockData: MetricsListItemRowData[] = [
	{
		key: 'metric1',
		metric_name: 'Metric 1',
		description: 'Test metric 1',
		metric_type: 'gauge',
		unit: 'bytes',
		samples: 100,
		timeseries: 10,
	},
	{
		key: 'metric2',
		metric_name: 'Metric 2',
		description: 'Test metric 2',
		metric_type: 'counter',
		unit: 'count',
		samples: 200,
		timeseries: 20,
	},
];

const mockQueryFilterExpression: Filter = {
	expression: '',
};

vi.mock('react-router-dom-v5-compat', async () => {
	const actual = await vi.importActual('react-router-dom-v5-compat');
	return {
		...actual,
		useSearchParams: vi.fn().mockReturnValue([{}, vi.fn()]),
		useNavigationType: (): any => 'PUSH',
	};
});
vi.mock('api/generated/services/metrics', { spy: true });
vi.mock('hooks/queryBuilder/useQueryBuilderOperations', { spy: true });
describe('MetricsTable', () => {
	beforeEach(() => {
		vi.mocked(useQueryBuilderOperationsHooks.useQueryOperations).mockReturnValue({
			handleChangeQueryData: vi.fn(),
		} as any);
	});

	vi.mocked(metricsGeneratedAPI.useListMetrics).mockReturnValue({
		data: {
			data: {
				metrics: [
					{
						metricName: 'metric1',
						description: '',
						type: '',
						unit: '',
						temporality: '',
						isMonotonic: false,
					},
					{
						metricName: 'metric2',
						description: '',
						type: '',
						unit: '',
						temporality: '',
						isMonotonic: false,
					},
				],
			},
			status: 'success',
		},
		isLoading: false,
		isError: false,
	} as unknown as ReturnType<typeof metricsGeneratedAPI.useListMetrics>);

	it('renders table with data correctly', () => {
		render(
			<MemoryRouter>
				<Provider store={store}>
					<MetricsTable
						isLoading={false}
						isError={false}
						data={mockData}
						pageSize={10}
						currentPage={1}
						onPaginationChange={vi.fn()}
						setOrderBy={vi.fn()}
						totalCount={2}
						openMetricDetails={vi.fn()}
						queryFilterExpression={mockQueryFilterExpression}
						onFilterChange={vi.fn()}
					/>
				</Provider>
			</MemoryRouter>,
		);

		expect(screen.getByText('List View')).toBeInTheDocument();
		expect(screen.getByText('Metric 1')).toBeInTheDocument();
		expect(screen.getByText('Metric 2')).toBeInTheDocument();
	});

	it('shows loading state', () => {
		render(
			<MemoryRouter>
				<Provider store={store}>
					<MetricsTable
						isError={false}
						data={mockData}
						pageSize={10}
						currentPage={1}
						onPaginationChange={vi.fn()}
						setOrderBy={vi.fn()}
						totalCount={2}
						openMetricDetails={vi.fn()}
						queryFilterExpression={mockQueryFilterExpression}
						isLoading
						onFilterChange={vi.fn()}
					/>
				</Provider>
			</MemoryRouter>,
		);

		expect(screen.getByTestId('metrics-table-loading-state')).toBeInTheDocument();
	});

	it('shows error state', () => {
		const mockError = new APIError({
			httpStatusCode: 400,
			error: {
				code: '400',
				message: 'invalid filter expression',
				url: '',
				errors: [],
			},
		});

		render(
			<MemoryRouter>
				<Provider store={store}>
					<MetricsTable
						isLoading={false}
						isError
						error={mockError}
						data={[]}
						pageSize={10}
						currentPage={1}
						onPaginationChange={vi.fn()}
						setOrderBy={vi.fn()}
						totalCount={2}
						openMetricDetails={vi.fn()}
						queryFilterExpression={mockQueryFilterExpression}
						onFilterChange={vi.fn()}
					/>
				</Provider>
			</MemoryRouter>,
		);

		expect(screen.getByText('400')).toBeInTheDocument();
		expect(screen.getByText('invalid filter expression')).toBeInTheDocument();
	});

	it('shows empty state when no data', () => {
		render(
			<MemoryRouter>
				<Provider store={store}>
					<MetricsTable
						isLoading={false}
						isError={false}
						data={[]}
						pageSize={10}
						currentPage={1}
						onPaginationChange={vi.fn()}
						setOrderBy={vi.fn()}
						totalCount={2}
						openMetricDetails={vi.fn()}
						queryFilterExpression={mockQueryFilterExpression}
						onFilterChange={vi.fn()}
					/>
				</Provider>
			</MemoryRouter>,
		);

		expect(screen.getByTestId('metrics-table-empty-state')).toBeInTheDocument();
		expect(
			screen.getByText(
				'This query had no results. Edit your query and try again!',
			),
		).toBeInTheDocument();
	});

	it('calls openMetricDetails when row is clicked', () => {
		const mockOpenMetricDetails = vi.fn();
		render(
			<MemoryRouter>
				<Provider store={store}>
					<MetricsTable
						isLoading={false}
						isError={false}
						data={mockData}
						pageSize={10}
						currentPage={1}
						onPaginationChange={vi.fn()}
						setOrderBy={vi.fn()}
						totalCount={2}
						openMetricDetails={mockOpenMetricDetails}
						queryFilterExpression={mockQueryFilterExpression}
						onFilterChange={vi.fn()}
					/>
				</Provider>
			</MemoryRouter>,
		);

		fireEvent.click(screen.getByText('Metric 1'));
		expect(mockOpenMetricDetails).toHaveBeenCalledWith(
			'metric1',
			'list',
			expect.any(Object),
		);
	});

	it('calls setOrderBy when column header is clicked', () => {
		const mockSetOrderBy = vi.fn();
		render(
			<MemoryRouter>
				<Provider store={store}>
					<MetricsTable
						isLoading={false}
						isError={false}
						data={mockData}
						pageSize={10}
						currentPage={1}
						onPaginationChange={vi.fn()}
						setOrderBy={mockSetOrderBy}
						totalCount={2}
						openMetricDetails={vi.fn()}
						queryFilterExpression={mockQueryFilterExpression}
						onFilterChange={vi.fn()}
					/>
				</Provider>
			</MemoryRouter>,
		);

		const samplesHeader = screen.getByText('SAMPLES');
		fireEvent.click(samplesHeader);

		expect(mockSetOrderBy).toHaveBeenCalledWith({
			key: {
				name: 'samples',
			},
			direction: 'asc',
		});
	});
});
