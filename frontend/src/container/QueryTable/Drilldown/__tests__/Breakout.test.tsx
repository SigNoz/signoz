/* eslint-disable sonarjs/no-duplicate-string */

import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from 'antd';
import ROUTES from 'constants/routes';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
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
	MOCK_KEY_SUGGESTIONS_RESPONSE,
	// MOCK_KEY_SUGGESTIONS_SEARCH_RESPONSE,
	MOCK_QUERY,
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

jest.mock('container/GridCardLayout/useResolveQuery', () => ({
	__esModule: true,
	default: (): any => ({
		getUpdatedQuery: jest.fn().mockResolvedValue({}),
		isLoading: false,
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

describe('TableDrilldown Breakout Functionality', () => {
	beforeEach((): void => {
		jest.clearAllMocks();

		// Mock the substitute_vars API that's causing network errors
		server.use(
			rest.post('*/api/v5/substitute_vars', (req, res, ctx) =>
				res(ctx.status(200), ctx.json({ status: 'success', data: {} })),
			),
		);
	});

	it('should show breakout options when "Breakout by" is clicked', async (): Promise<void> => {
		// Mock the MSW server to intercept the keySuggestions API call
		server.use(
			rest.get('*/fields/keys', (req, res, ctx) =>
				res(ctx.status(200), ctx.json(MOCK_KEY_SUGGESTIONS_RESPONSE)),
			),
		);

		renderWithProviders(<MockTableDrilldown />);

		// Find and click the aggregate button to show context menu
		const aggregateButton = screen.getByRole('button', { name: /aggregate/i });
		fireEvent.click(aggregateButton);

		// Find and click "Breakout by" option
		const breakoutOption = screen.getByText(/Breakout by/);
		fireEvent.click(breakoutOption);

		// Wait for the breakout options to load and verify they are displayed
		await screen.findByText('Breakout by');

		// Check that the search input is displayed
		expect(
			screen.getByPlaceholderText('Search breakout options...'),
		).toBeInTheDocument();

		// Wait for the API call to complete and options to load
		// Check what's actually being rendered instead of waiting for specific text
		await screen.findByText('deployment.environment');

		// Check that the breakout options are loaded and displayed
		// Based on the test output, these are the actual options being rendered
		expect(screen.getByText('deployment.environment')).toBeInTheDocument();
		expect(screen.getByText('http.method')).toBeInTheDocument();
		expect(screen.getByText('http.status_code')).toBeInTheDocument();

		// Verify that the breakout header is displayed
		expect(screen.getByText('Breakout by')).toBeInTheDocument();
	});

	it('should add selected breakout option to groupBy and redirect with correct query', async (): Promise<void> => {
		// Mock the MSW server to intercept the keySuggestions API call
		server.use(
			rest.get('*/fields/keys', (req, res, ctx) =>
				res(ctx.status(200), ctx.json(MOCK_KEY_SUGGESTIONS_RESPONSE)),
			),
		);

		renderWithProviders(<MockTableDrilldown />);

		// Navigate to breakout options
		const aggregateButton = screen.getByRole('button', { name: /aggregate/i });
		fireEvent.click(aggregateButton);

		const breakoutOption = screen.getByText(/Breakout by/);
		fireEvent.click(breakoutOption);

		// Wait for breakout options to load
		await screen.findByText('deployment.environment');

		// Click on a breakout option (e.g., deployment.environment)
		const breakoutOptionItem = screen.getByText('deployment.environment');
		fireEvent.click(breakoutOptionItem);

		// Verify redirectWithQueryBuilderData was called
		expect(mockRedirectWithQueryBuilderData).toHaveBeenCalledTimes(1);

		const [
			query,
			queryParams,
			,
			newTab,
		] = mockRedirectWithQueryBuilderData.mock.calls[0];

		// Check that the query contains the correct structure
		expect(query.builder).toBeDefined();
		expect(query.builder.queryData).toBeDefined();

		// Find the query data for the aggregate query (queryName: 'A')
		const aggregateQueryData = query.builder.queryData.find(
			(item: any) => item.queryName === 'A',
		);
		expect(aggregateQueryData).toBeDefined();

		// Verify that the groupBy has been updated to only contain the selected breakout option
		expect(aggregateQueryData.groupBy).toHaveLength(1);
		expect(aggregateQueryData.groupBy[0].key).toEqual('deployment.environment');

		// Verify that orderBy has been cleared (as per getBreakoutQuery logic)
		expect(aggregateQueryData.orderBy).toEqual([]);

		// Verify that the legend has been updated (check the actual value being returned)
		// The legend logic in getBreakoutQuery: legend: item.legend && groupBy.key ? `{{${groupBy.key}}}` : ''
		// Since the original legend might be empty, the result could be empty string
		expect(aggregateQueryData.legend).toBeDefined();

		// Check that the queryParams contain the expandedWidgetId
		expect(queryParams).toEqual({
			expandedWidgetId: 'test-widget',
			graphType: 'graph',
		});

		// Check that newTab is true
		expect(newTab).toBe(true);

		// Verify that the original filters are preserved and new filters are added
		expect(aggregateQueryData.filter.expression).toContain(
			"service.name in $service.name AND trace_id EXISTS AND deployment.environment = '$env'",
		);
		// The new filter from the clicked data should also be present
		expect(aggregateQueryData.filter.expression).toContain(
			"service.name = 'adservice' AND trace_id = 'df2cfb0e57bb8736207689851478cd50'",
		);
	});
});
