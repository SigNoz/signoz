import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
	getAllEndpointsWidgetData,
	getGroupByExpressionFromRowData,
} from 'container/ApiMonitoring/utils';

import AllEndPoints from '../Explorer/Domains/DomainDetails/AllEndPoints';
import {
	SPAN_ATTRIBUTES,
	VIEWS,
} from '../Explorer/Domains/DomainDetails/constants';

// Mock the dependencies
jest.mock('container/ApiMonitoring/utils', () => ({
	getAllEndpointsWidgetData: jest.fn(),
	getGroupByExpressionFromRowData: jest.fn(),
}));

jest.mock('container/WidgetCard/Card', () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(({ customOnRowClick }) => (
		<div data-testid="grid-card-mock">
			<button
				type="button"
				data-testid="row-click-button"
				onClick={(): void =>
					customOnRowClick({ [SPAN_ATTRIBUTES.HTTP_URL]: '/api/test' })
				}
			>
				Click Row
			</button>
		</div>
	)),
}));

jest.mock('components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch', () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(({ onRun }) => (
		<div data-testid="query-builder-mock">
			<button
				type="button"
				data-testid="filter-change-button"
				onClick={(): void => onRun("test = 'test'")}
			>
				Change Filter
			</button>
		</div>
	)),
}));

jest.mock('container/QueryBuilder/filters/GroupByFilter/GroupByFilter', () => ({
	GroupByFilter: jest.fn().mockImplementation(({ onChange }) => (
		<div data-testid="select-mock">
			<button
				data-testid="select-change-button"
				type="button"
				onClick={(): void =>
					onChange([
						{
							id: 'http.status_code--string--attribute',
							key: 'http.status_code',
							dataType: 'string',
							type: 'attribute',
						},
					])
				}
			>
				Change GroupBy
			</button>
		</div>
	)),
}));

// Mock useApiMonitoringParams hook
jest.mock('container/ApiMonitoring/queryParams', () => ({
	useApiMonitoringParams: jest.fn().mockReturnValue([
		{
			showIP: true,
			selectedDomain: '',
			selectedView: 'all_endpoints',
			selectedEndPointName: '',
			groupBy: [],
			allEndpointsFilterExpression: undefined,
			endPointDetailsFilterExpression: undefined,
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
		initialFilterExpression: '',
		setInitialFilterExpressionEndPointStats: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup mock implementations
		(getAllEndpointsWidgetData as jest.Mock).mockReturnValue({
			id: 'test-widget',
			title: 'Endpoint Overview',
			description: 'Endpoint Overview',
			panelTypes: 'table',
			queryData: [],
		});

		(getGroupByExpressionFromRowData as jest.Mock).mockReturnValue(
			"status = '200'",
		);
	});

	// Add cleanup after each test
	afterEach(() => {
		cleanup();
	});

	it('renders component correctly', () => {
		render(<AllEndPoints {...mockProps} />);

		// Verify basic component rendering
		expect(screen.getByText('Group by')).toBeInTheDocument();
		expect(screen.getByTestId('query-builder-mock')).toBeInTheDocument();
		expect(screen.getByTestId('select-mock')).toBeInTheDocument();
		expect(screen.getByTestId('grid-card-mock')).toBeInTheDocument();
	});

	it('handles filter changes', () => {
		render(<AllEndPoints {...mockProps} />);

		// Trigger filter change
		fireEvent.click(screen.getByTestId('filter-change-button'));

		// Check if getAllEndpointsWidgetData was called with updated filters
		expect(getAllEndpointsWidgetData).toHaveBeenCalledWith(
			expect.anything(),
			'test-domain',
			"test = 'test'",
		);
	});

	it('handles group by changes', () => {
		render(<AllEndPoints {...mockProps} />);

		// Trigger group by change
		fireEvent.click(screen.getByTestId('select-change-button'));

		// The picked keys are stored as given and written to the URL as bare names
		expect(mockProps.setGroupBy).toHaveBeenCalledWith([
			expect.objectContaining({ key: 'http.status_code', type: 'attribute' }),
		]);
	});

	it('handles row click in grid card', async () => {
		render(<AllEndPoints {...mockProps} />);

		// Trigger row click
		fireEvent.click(screen.getByTestId('row-click-button'));

		// Check if proper functions were called
		expect(mockProps.setSelectedEndPointName).toHaveBeenCalledWith('/api/test');
		expect(mockProps.setSelectedView).toHaveBeenCalledWith(VIEWS.ENDPOINT_STATS);
		expect(
			mockProps.setInitialFilterExpressionEndPointStats,
		).toHaveBeenCalledWith("status = '200'");
		expect(getGroupByExpressionFromRowData).toHaveBeenCalled();
	});
});
