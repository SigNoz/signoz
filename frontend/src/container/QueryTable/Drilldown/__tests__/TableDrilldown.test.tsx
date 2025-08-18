import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from 'antd';
import ROUTES from 'constants/routes';
import ContextMenu, { useCoordinates } from 'periscope/components/ContextMenu';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from 'store';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import useTableContextMenu from '../useTableContextMenu';
import {
	MOCK_AGGREGATE_DATA,
	MOCK_COORDINATES,
	MOCK_FILTER_DATA,
	MOCK_QUERY,
	MOCK_QUERY_WITH_FILTER,
} from './mockTableData';

// Mock the necessary hooks and dependencies
const mockSafeNavigate = jest.fn();
const mockRedirectWithQueryBuilderData = jest.fn();

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): any => ({
		redirectWithQueryBuilderData: mockRedirectWithQueryBuilderData,
	}),
}));

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${process.env.FRONTEND_API_ENDPOINT}/${ROUTES.DASHBOARD}/`,
	}),
}));

jest.mock('react-redux', () => ({
	...jest.requireActual('react-redux'),
	useSelector: (): any => ({
		globalTime: {
			selectedTime: {
				startTime: 1713734400000,
				endTime: 1713738000000,
			},
			maxTime: 1713738000000,
			minTime: 1713734400000,
		},
	}),
}));

jest.mock('container/QueryTable/Drilldown/useDashboardVarConfig', () => ({
	__esModule: true,
	default: (): any => ({
		dashbaordVariablesConfig: {
			items: <>items</>,
		},
		// contextItems: <></>,
	}),
}));

function MockTableDrilldown(): JSX.Element {
	const {
		coordinates,
		popoverPosition,
		clickedData,
		onClose,
		onClick,
		subMenu,
		setSubMenu,
	} = useCoordinates();

	const { menuItemsConfig } = useTableContextMenu({
		widgetId: 'test-widget',
		query: MOCK_QUERY as Query,
		clickedData,
		onClose,
		coordinates,
		subMenu,
		setSubMenu,
	});

	const handleClick = (type: 'aggregate' | 'filter'): void => {
		// Simulate the same flow as handleColumnClick in QueryTable
		onClick(
			MOCK_COORDINATES,
			type === 'aggregate' ? MOCK_AGGREGATE_DATA : MOCK_FILTER_DATA,
		);
	};

	return (
		<div style={{ padding: '20px' }}>
			<Button type="primary" onClick={(): void => handleClick('aggregate')}>
				Aggregate
			</Button>

			<Button type="primary" onClick={(): void => handleClick('filter')}>
				Filter
			</Button>

			<ContextMenu
				coordinates={coordinates}
				popoverPosition={popoverPosition}
				onClose={onClose}
				items={menuItemsConfig.items}
				title={
					typeof menuItemsConfig.header === 'string'
						? menuItemsConfig.header
						: undefined
				}
			/>
		</div>
	);
}

const renderWithProviders = (
	component: React.ReactElement,
): ReturnType<typeof render> =>
	render(
		<MockQueryClientProvider>
			<MemoryRouter>
				<Provider store={store}>{component}</Provider>
			</MemoryRouter>
		</MockQueryClientProvider>,
	);

describe('TableDrilldown', () => {
	beforeEach((): void => {
		jest.clearAllMocks();
	});

	it('should show context menu filter options when button is clicked', (): void => {
		renderWithProviders(<MockTableDrilldown />);

		// Find and click the button
		const button = screen.getByRole('button', { name: /filter/i });
		fireEvent.click(button);

		// Check that the context menu options are displayed
		expect(screen.getByText('Filter by trace_id')).toBeInTheDocument();
	});

	it('should show context menu aggregate options when button is clicked', (): void => {
		renderWithProviders(<MockTableDrilldown />);

		// Find and click the button
		const button = screen.getByRole('button', { name: /aggregate/i });
		fireEvent.click(button);

		// Check that the context menu options are displayed
		expect(screen.getByText('logs')).toBeInTheDocument();
		expect(screen.getByText('count()')).toBeInTheDocument();
		expect(screen.getByText('View in Logs')).toBeInTheDocument();
		expect(screen.getByText('View in Traces')).toBeInTheDocument();
		expect(screen.getByText(/Breakout by/)).toBeInTheDocument();
	});

	it('should navigate to logs explorer with correct query when "View in Logs" is clicked', (): void => {
		renderWithProviders(<MockTableDrilldown />);

		// Find and click the button to show context menu
		const button = screen.getByRole('button', { name: /aggregate/i });
		fireEvent.click(button);

		// Find and click "View in Logs" option
		const viewInLogsOption = screen.getByText('View in Logs');
		fireEvent.click(viewInLogsOption);

		// Verify safeNavigate was called with the correct URL
		expect(mockSafeNavigate).toHaveBeenCalledTimes(1);

		const [url, options] = mockSafeNavigate.mock.calls[0];

		// Check the URL structure
		expect(url).toContain(ROUTES.LOGS_EXPLORER);
		expect(url).toContain('?');

		// Parse the URL to check query parameters
		const urlObj = new URL(url, 'http://localhost');

		// Check that compositeQuery parameter exists and contains the query with filters
		expect(urlObj.searchParams.has('compositeQuery')).toBe(true);

		const compositeQuery = JSON.parse(
			urlObj.searchParams.get('compositeQuery') || '{}',
		);

		// Verify the query structure includes the filters from clicked data
		expect(compositeQuery.builder).toBeDefined();
		expect(compositeQuery.builder.queryData).toBeDefined();

		// Check that the query contains the correct filter expression
		// The filter should include the clicked data filters (service.name = 'adservice', trace_id = 'df2cfb0e57bb8736207689851478cd50')
		const firstQueryData = compositeQuery.builder.queryData[0];
		expect(firstQueryData.filters).toBeDefined();

		// Check that newTab option is set to true
		expect(options).toEqual({ newTab: true });
	});

	it('should navigate to traces explorer with correct query when "View in Traces" is clicked', (): void => {
		renderWithProviders(<MockTableDrilldown />);

		// Find and click the button to show context menu
		const button = screen.getByRole('button', { name: /aggregate/i });
		fireEvent.click(button);

		// Find and click "View in Traces" option
		const viewInTracesOption = screen.getByText('View in Traces');
		fireEvent.click(viewInTracesOption);

		// Verify safeNavigate was called with the correct URL
		expect(mockSafeNavigate).toHaveBeenCalledTimes(1);

		const [url, options] = mockSafeNavigate.mock.calls[0];

		// Check the URL structure
		expect(url).toContain(ROUTES.TRACES_EXPLORER);
		expect(url).toContain('?');

		// Parse the URL to check query parameters
		const urlObj = new URL(url, 'http://localhost');

		// Check that compositeQuery parameter exists and contains the query with filters
		expect(urlObj.searchParams.has('compositeQuery')).toBe(true);

		const compositeQuery = JSON.parse(
			urlObj.searchParams.get('compositeQuery') || '{}',
		);
		// Verify the query structure includes the filters from clicked data
		expect(compositeQuery.builder).toBeDefined();
		expect(compositeQuery.builder.queryData).toBeDefined();

		// Check that the query contains the correct filter expression
		// The filter should include the clicked data filters (service.name = 'adservice', trace_id = 'df2cfb0e57bb8736207689851478cd50')
		const firstQueryData = compositeQuery.builder.queryData[0];
		expect(firstQueryData.filter.expression).toEqual(MOCK_QUERY_WITH_FILTER);

		// Check that newTab option is set to true
		expect(options).toEqual({ newTab: true });
	});

	it('should show filter options and navigate with correct query when filter option is clicked', (): void => {
		renderWithProviders(<MockTableDrilldown />);

		// Find and click the Filter button to show filter context menu
		const filterButton = screen.getByRole('button', { name: /filter/i });
		fireEvent.click(filterButton);

		// Check that the filter context menu is displayed
		expect(screen.getByText('Filter by trace_id')).toBeInTheDocument();

		// Check that the filter operators are displayed
		expect(screen.getByText('Is this')).toBeInTheDocument(); // = operator
		expect(screen.getByText('Is not this')).toBeInTheDocument(); // != operator

		// Click on "Is this" (equals operator)
		const equalsOption = screen.getByText('Is this');
		fireEvent.click(equalsOption);

		// Verify redirectWithQueryBuilderData was called instead of safeNavigate
		expect(mockRedirectWithQueryBuilderData).toHaveBeenCalledTimes(1);

		const [
			query,
			queryParams,
			,
			newTab,
		] = mockRedirectWithQueryBuilderData.mock.calls[0];

		// Check that the query contains the filter that was added
		expect(query.builder).toBeDefined();
		expect(query.builder.queryData).toBeDefined();

		const firstQueryData = query.builder.queryData[0];

		// The filter should include the original filter plus the new one from clicked data
		// Original: "service.name = '$service.name' AND trace_id EXISTS AND deployment.environment = '$env'"
		// New: trace_id = 'df2cfb0e57bb8736207689851478cd50'
		expect(firstQueryData.filter.expression).toContain(
			"service.name = '$service.name' AND trace_id EXISTS AND deployment.environment = '$env'",
		);
		expect(firstQueryData.filter.expression).toContain(
			"trace_id = 'df2cfb0e57bb8736207689851478cd50'",
		);

		// Check that the queryParams contain the expandedWidgetId
		expect(queryParams).toEqual({ expandedWidgetId: 'test-widget' });

		// Check that newTab is true
		expect(newTab).toBe(true);
	});
});

export default MockTableDrilldown;
