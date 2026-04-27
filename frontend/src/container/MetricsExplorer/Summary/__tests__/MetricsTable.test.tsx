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

jest.mock('react-router-dom-v5-compat', () => {
	const actual = jest.requireActual('react-router-dom-v5-compat');
	return {
		...actual,
		useSearchParams: jest.fn().mockReturnValue([{}, jest.fn()]),
		useNavigationType: (): any => 'PUSH',
	};
});
describe('MetricsTable', () => {
	beforeEach(() => {
		jest
			.spyOn(useQueryBuilderOperationsHooks, 'useQueryOperations')
			.mockReturnValue({
				handleChangeQueryData: jest.fn(),
			} as any);
	});

	jest.spyOn(metricsGeneratedAPI, 'useListMetrics').mockReturnValue({
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
						onPaginationChange={jest.fn()}
						setOrderBy={jest.fn()}
						totalCount={2}
						openMetricDetails={jest.fn()}
						queryFilterExpression={mockQueryFilterExpression}
						onFilterChange={jest.fn()}
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
						onPaginationChange={jest.fn()}
						setOrderBy={jest.fn()}
						totalCount={2}
						openMetricDetails={jest.fn()}
						queryFilterExpression={mockQueryFilterExpression}
						isLoading
						onFilterChange={jest.fn()}
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
						onPaginationChange={jest.fn()}
						setOrderBy={jest.fn()}
						totalCount={2}
						openMetricDetails={jest.fn()}
						queryFilterExpression={mockQueryFilterExpression}
						onFilterChange={jest.fn()}
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
						onPaginationChange={jest.fn()}
						setOrderBy={jest.fn()}
						totalCount={2}
						openMetricDetails={jest.fn()}
						queryFilterExpression={mockQueryFilterExpression}
						onFilterChange={jest.fn()}
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
		const mockOpenMetricDetails = jest.fn();
		render(
			<MemoryRouter>
				<Provider store={store}>
					<MetricsTable
						isLoading={false}
						isError={false}
						data={mockData}
						pageSize={10}
						currentPage={1}
						onPaginationChange={jest.fn()}
						setOrderBy={jest.fn()}
						totalCount={2}
						openMetricDetails={mockOpenMetricDetails}
						queryFilterExpression={mockQueryFilterExpression}
						onFilterChange={jest.fn()}
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
		const mockSetOrderBy = jest.fn();
		render(
			<MemoryRouter>
				<Provider store={store}>
					<MetricsTable
						isLoading={false}
						isError={false}
						data={mockData}
						pageSize={10}
						currentPage={1}
						onPaginationChange={jest.fn()}
						setOrderBy={mockSetOrderBy}
						totalCount={2}
						openMetricDetails={jest.fn()}
						queryFilterExpression={mockQueryFilterExpression}
						onFilterChange={jest.fn()}
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
