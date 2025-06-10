import { fireEvent, render, screen } from '@testing-library/react';
import * as useGetMetricsListFilterValues from 'hooks/metricsExplorer/useGetMetricsListFilterValues';
import * as useQueryBuilderOperationsHooks from 'hooks/queryBuilder/useQueryBuilderOperations';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from 'store';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

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

const mockQueryFilters: TagFilter = {
	items: [],
	op: 'AND',
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

	jest
		.spyOn(useGetMetricsListFilterValues, 'useGetMetricsListFilterValues')
		.mockReturnValue({
			data: {
				statusCode: 200,
				payload: {
					status: 'success',
					data: {
						filterValues: ['metric1', 'metric2'],
					},
				},
			},
			isLoading: false,
			isError: false,
		} as any);

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
						queryFilters={mockQueryFilters}
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
						queryFilters={mockQueryFilters}
						isLoading
					/>
				</Provider>
			</MemoryRouter>,
		);

		expect(screen.getByTestId('metrics-table-loading-state')).toBeInTheDocument();
	});

	it('shows error state', () => {
		render(
			<MemoryRouter>
				<Provider store={store}>
					<MetricsTable
						isLoading={false}
						isError
						data={[]}
						pageSize={10}
						currentPage={1}
						onPaginationChange={jest.fn()}
						setOrderBy={jest.fn()}
						totalCount={2}
						openMetricDetails={jest.fn()}
						queryFilters={mockQueryFilters}
					/>
				</Provider>
			</MemoryRouter>,
		);

		expect(screen.getByTestId('metrics-table-error-state')).toBeInTheDocument();
		expect(
			screen.getByText(
				'Error fetching metrics. If the problem persists, please contact support.',
			),
		).toBeInTheDocument();
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
						queryFilters={mockQueryFilters}
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
						queryFilters={mockQueryFilters}
					/>
				</Provider>
			</MemoryRouter>,
		);

		fireEvent.click(screen.getByText('Metric 1'));
		expect(mockOpenMetricDetails).toHaveBeenCalledWith('metric1', 'list');
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
						queryFilters={mockQueryFilters}
					/>
				</Provider>
			</MemoryRouter>,
		);

		const samplesHeader = screen.getByText('SAMPLES');
		fireEvent.click(samplesHeader);

		expect(mockSetOrderBy).toHaveBeenCalledWith({
			columnName: 'samples',
			order: 'asc',
		});
	});
});
