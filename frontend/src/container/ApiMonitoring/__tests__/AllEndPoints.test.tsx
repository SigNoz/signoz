import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
	getAllEndpointsWidgetData,
	getGroupByFiltersFromGroupByValues,
} from 'container/ApiMonitoring/utils';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';

import AllEndPoints from '../Explorer/Domains/DomainDetails/AllEndPoints';
import {
	SPAN_ATTRIBUTES,
	VIEWS,
} from '../Explorer/Domains/DomainDetails/constants';

// Mock the dependencies
jest.mock('container/ApiMonitoring/utils', () => ({
	getAllEndpointsWidgetData: jest.fn(),
	getGroupByFiltersFromGroupByValues: jest.fn(),
}));

jest.mock('container/GridCardLayout/GridCard', () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(({ customOnRowClick }) => (
		<div data-testid="grid-card-mock">
			<button
				type="button"
				data-testid="row-click-button"
				onClick={(): void =>
					customOnRowClick({ [SPAN_ATTRIBUTES.URL_PATH]: '/api/test' })
				}
			>
				Click Row
			</button>
		</div>
	)),
}));

jest.mock(
	'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2',
	() => ({
		__esModule: true,
		default: jest.fn().mockImplementation(({ onChange }) => (
			<div data-testid="query-builder-mock">
				<button
					type="button"
					data-testid="filter-change-button"
					onClick={(): void =>
						onChange({
							items: [{ id: 'test', key: 'test', op: '=', value: 'test' }],
							op: 'AND',
						})
					}
				>
					Change Filter
				</button>
			</div>
		)),
	}),
);

jest.mock('hooks/queryBuilder/useGetAggregateKeys', () => ({
	useGetAggregateKeys: jest.fn(),
}));

jest.mock('antd', () => {
	const originalModule = jest.requireActual('antd');
	return {
		...originalModule,
		Select: jest.fn().mockImplementation(({ onChange }) => (
			<div data-testid="select-mock">
				<button
					data-testid="select-change-button"
					type="button"
					onClick={(): void => onChange(['http.status_code'])}
				>
					Change GroupBy
				</button>
			</div>
		)),
	};
});

// Mock useApiMonitoringParams hook
jest.mock('container/ApiMonitoring/queryParams', () => ({
	useApiMonitoringParams: jest.fn().mockReturnValue([
		{
			showIP: true,
			selectedDomain: '',
			selectedView: 'all_endpoints',
			selectedEndPointName: '',
			groupBy: [],
			allEndpointsLocalFilters: undefined,
			endPointDetailsLocalFilters: undefined,
			modalTimeRange: undefined,
			selectedInterval: undefined,
		},
		jest.fn(),
	]),
}));

describe('AllEndPoints', () => {
	const mockProps = {
		domainName: 'test-domain',
		setSelectedEndPointName: jest.fn(),
		setSelectedView: jest.fn(),
		groupBy: [],
		setGroupBy: jest.fn(),
		timeRange: {
			startTime: 1609459200000,
			endTime: 1609545600000,
		},
		initialFilters: { op: 'AND', items: [] },
		setInitialFiltersEndPointStats: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup mock implementations
		(useGetAggregateKeys as jest.Mock).mockReturnValue({
			data: {
				payload: {
					attributeKeys: [
						{
							key: 'http.status_code',
							dataType: 'string',
							type: '',
						},
					],
				},
			},
			isLoading: false,
		});

		(getAllEndpointsWidgetData as jest.Mock).mockReturnValue({
			id: 'test-widget',
			title: 'Endpoint Overview',
			description: 'Endpoint Overview',
			panelTypes: 'table',
			queryData: [],
		});

		(getGroupByFiltersFromGroupByValues as jest.Mock).mockReturnValue({
			items: [{ id: 'group-filter', key: 'status', op: '=', value: '200' }],
			op: 'AND',
		});
	});

	// Add cleanup after each test
	afterEach(() => {
		cleanup();
	});

	it('renders component correctly', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<AllEndPoints {...mockProps} />);

		// Verify basic component rendering
		expect(screen.getByText('Group by')).toBeInTheDocument();
		expect(screen.getByTestId('query-builder-mock')).toBeInTheDocument();
		expect(screen.getByTestId('select-mock')).toBeInTheDocument();
		expect(screen.getByTestId('grid-card-mock')).toBeInTheDocument();
	});

	it('handles filter changes', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<AllEndPoints {...mockProps} />);

		// Trigger filter change
		fireEvent.click(screen.getByTestId('filter-change-button'));

		// Check if getAllEndpointsWidgetData was called with updated filters
		expect(getAllEndpointsWidgetData).toHaveBeenCalledWith(
			expect.anything(),
			'test-domain',
			expect.objectContaining({
				items: expect.arrayContaining([expect.objectContaining({ id: 'test' })]),
				op: 'AND',
			}),
		);
	});

	it('handles group by changes', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<AllEndPoints {...mockProps} />);

		// Trigger group by change
		fireEvent.click(screen.getByTestId('select-change-button'));

		// Check if setGroupBy was called with updated group by value
		expect(mockProps.setGroupBy).toHaveBeenCalled();
	});

	it('handles row click in grid card', async () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<AllEndPoints {...mockProps} />);

		// Trigger row click
		fireEvent.click(screen.getByTestId('row-click-button'));

		// Check if proper functions were called
		expect(mockProps.setSelectedEndPointName).toHaveBeenCalledWith('/api/test');
		expect(mockProps.setSelectedView).toHaveBeenCalledWith(VIEWS.ENDPOINT_STATS);
		expect(mockProps.setInitialFiltersEndPointStats).toHaveBeenCalled();
		expect(getGroupByFiltersFromGroupByValues).toHaveBeenCalled();
	});
});
