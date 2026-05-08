import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { MemoryRouter as MemoryRouterV5 } from 'react-router-dom-v5-compat';
import { VirtuosoMockContext } from 'react-virtuoso';
import { TooltipProvider } from '@signozhq/ui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InfraMonitoringEvents } from 'constants/events';
import {
	NuqsTestingAdapter,
	OnUrlUpdateFunction,
	UrlUpdateEvent,
} from 'nuqs/adapters/testing';
import { AppProvider } from 'providers/App/App';
import TimezoneProvider from 'providers/Timezone';
import store from 'store';
import { openInNewTab } from 'utils/navigation';

import { TableColumnDef } from 'components/TanStackTableView';

import { InfraMonitoringEntity } from '../../constants';
import { K8sBaseList, K8sBaseListProps, K8sEntityData } from '../K8sBaseList';

jest.mock('utils/navigation', () => ({
	...jest.requireActual('utils/navigation'),
	openInNewTab: jest.fn(),
}));

const openInNewTabMock = openInNewTab as jest.Mock;

// Mock Date.now to prevent flaky tests due to time-dependent values
const MOCK_NOW = 1700000000000; // Fixed timestamp
jest.spyOn(Date, 'now').mockReturnValue(MOCK_NOW);

// Mock DrawerWrapper to avoid CSS issues with jsdom
// SyntaxError: 'div#radix-:rbv,,._dialog__content_qf8bf_22 :focus' is not a valid selector
jest.mock('@signozhq/ui', () => {
	const actual = jest.requireActual('@signozhq/ui');
	return {
		...actual,
		DrawerWrapper: ({
			open,
			children,
			title,
		}: {
			open: boolean;
			children: React.ReactNode;
			title: string;
			onOpenChange?: (isOpen: boolean) => void;
		}): JSX.Element | null =>
			open ? (
				<div data-testid="drawer-wrapper" data-title={title}>
					{children}
				</div>
			) : null,
	};
});

// Test data types that satisfy K8sEntityData constraint
type TestItemWithTitle = {
	id: string;
	title: string;
	meta?: Record<string, string>;
};
type TestItem = { id: string; meta?: Record<string, string> };
type TestItemWithName = {
	id: string;
	name: string;
	desc: string;
	meta?: Record<string, string>;
};
type TestItemWithGroup = {
	id: string;
	name: string;
	group: string;
	meta?: Record<string, string>;
};

// Helper to create TanStack columns for tests
function createTestColumnsWithTitle(): TableColumnDef<TestItemWithTitle>[] {
	return [
		{
			id: 'id',
			header: (): React.ReactNode => 'Id',
			accessorFn: (row): string => row.id,
			cell: ({ value }): React.ReactNode => <>{value}</>,
			enableSort: true,
		},
		{
			id: 'title',
			header: (): React.ReactNode => 'Title',
			accessorFn: (row): string => row.title,
			cell: ({ value }): React.ReactNode => <>{value}</>,
		},
	];
}

function createTestColumns(): TableColumnDef<TestItem>[] {
	return [
		{
			id: 'id',
			header: (): React.ReactNode => 'Id',
			accessorFn: (row): string => row.id,
			cell: ({ value }): React.ReactNode => <>{value}</>,
		},
	];
}

function createTestColumnsWithName(): TableColumnDef<TestItemWithName>[] {
	return [
		{
			id: 'id',
			header: (): React.ReactNode => 'Id',
			accessorFn: (row): string => row.id,
			cell: ({ value }): React.ReactNode => <>{value}</>,
		},
		{
			id: 'name',
			header: (): React.ReactNode => 'Name',
			accessorFn: (row): string => row.name,
			cell: ({ value }): React.ReactNode => <>{value}</>,
		},
		{
			id: 'desc',
			header: (): React.ReactNode => 'Description',
			accessorFn: (row): string => row.desc,
			cell: ({ value }): React.ReactNode => <>{value}</>,
		},
	];
}

function createTestColumnsWithGroup(): TableColumnDef<TestItemWithGroup>[] {
	return [
		{
			id: 'id',
			header: (): React.ReactNode => 'Id',
			accessorFn: (row): string => row.id,
			cell: ({ value }): React.ReactNode => <>{value}</>,
		},
		{
			id: 'name',
			header: (): React.ReactNode => 'Name',
			accessorFn: (row): string => row.name,
			cell: ({ value }): React.ReactNode => <>{value}</>,
		},
		{
			id: 'group',
			header: (): React.ReactNode => 'Group',
			accessorFn: (row): string => row.group,
			cell: ({ value }): React.ReactNode => <>{value}</>,
		},
	];
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function renderComponent<T extends K8sEntityData>({
	queryParams,
	onUrlUpdate,
	...props
}: K8sBaseListProps<T> & {
	queryParams?: Record<string, string>;
	onUrlUpdate?: OnUrlUpdateFunction;
}) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

	return render(
		<MemoryRouter>
			<MemoryRouterV5>
				<TimezoneProvider>
					<QueryClientProvider client={queryClient}>
						<AppProvider>
							<Provider store={store}>
								<NuqsTestingAdapter
									searchParams={queryParams}
									onUrlUpdate={onUrlUpdate}
								>
									<VirtuosoMockContext.Provider
										value={{ viewportHeight: 800, itemHeight: 50 }}
									>
										<TooltipProvider>
											<K8sBaseList {...props} />
										</TooltipProvider>
									</VirtuosoMockContext.Provider>
								</NuqsTestingAdapter>
							</Provider>
						</AppProvider>
					</QueryClientProvider>
				</TimezoneProvider>
			</MemoryRouterV5>
		</MemoryRouter>,
	);
}

describe('K8sBaseList', () => {
	describe('with items in the list', () => {
		const itemId = Math.random().toString(36).slice(7);
		const itemId2 = Math.random().toString(36).slice(7);
		const onUrlUpdateMock = jest.fn<void, [UrlUpdateEvent]>();
		const fetchListDataMock = jest.fn<
			ReturnType<K8sBaseListProps<TestItemWithTitle>['fetchListData']>,
			Parameters<K8sBaseListProps<TestItemWithTitle>['fetchListData']>
		>();

		beforeEach(() => {
			onUrlUpdateMock.mockClear();
			fetchListDataMock.mockClear();
			openInNewTabMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [
					{ id: `PodId:${itemId}`, title: `PodTitle:${itemId}` },
					{ id: `PodId:${itemId2}`, title: `PodTitle:${itemId2}` },
				],
				total: 25,
				error: null,
			});

			renderComponent<TestItemWithTitle>({
				onUrlUpdate: onUrlUpdateMock,
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				tableColumns: createTestColumnsWithTitle(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});
		});

		it('should render all the items in the list', async () => {
			await waitFor(async () => {
				await expect(
					screen.findByText(`PodId:${itemId}`),
				).resolves.toBeInTheDocument();
				await expect(
					screen.findByText(`PodTitle:${itemId}`),
				).resolves.toBeInTheDocument();
				await expect(
					screen.findByText(`PodId:${itemId2}`),
				).resolves.toBeInTheDocument();
				await expect(
					screen.findByText(`PodTitle:${itemId2}`),
				).resolves.toBeInTheDocument();
			});
		});

		it('should call fetchListData with default filters', async () => {
			await waitFor(() => {
				expect(fetchListDataMock).toHaveBeenCalled();
			});

			const [filters] = fetchListDataMock.mock.calls[0];
			expect(filters.limit).toBe(10);
			expect(filters.offset).toBe(0);
			expect(filters.filters).toStrictEqual({ items: [], op: 'AND' });
			expect(filters.groupBy).toBeUndefined();
			expect(filters.orderBy).toBeUndefined();
		});

		it('should click to open the row details and update selectedItem in URL', async () => {
			const user = userEvent.setup();

			const firstRowEl = await screen.findByText(`PodId:${itemId}`);
			await user.click(firstRowEl);

			await waitFor(() => {
				const selectedItem = onUrlUpdateMock.mock.calls
					.map((call) => call[0].searchParams.get('selectedItem'))
					.filter(Boolean)
					.pop();
				expect(selectedItem).toBe(`PodId:${itemId}`);
			});
		});

		it('should update orderBy in URL when clicking sortable column header', async () => {
			const user = userEvent.setup();

			await waitFor(() => {
				expect(screen.getByText(`PodId:${itemId}`)).toBeInTheDocument();
			});

			// TanStackTable renders a sort button with title attribute
			const sortButton = screen.getByTitle('Id');
			await user.click(sortButton);

			await waitFor(() => {
				const lastOrderBy = onUrlUpdateMock.mock.calls
					.map((call) => call[0].searchParams.get('orderBy'))
					.filter(Boolean)
					.pop();

				expect(lastOrderBy).toBeDefined();
				const parsed = JSON.parse(lastOrderBy as string);
				expect(parsed.columnName).toBe('id');
				expect(parsed.order).toBe('asc');
			});
		});

		it('should toggle sort order in URL on subsequent header clicks', async () => {
			await waitFor(() => {
				expect(screen.getByText(`PodId:${itemId}`)).toBeInTheDocument();
			});

			// Track orderBy calls
			const getOrderByCalls = (): string[] =>
				onUrlUpdateMock.mock.calls
					.map((call) => call[0].searchParams.get('orderBy'))
					.filter(Boolean) as string[];

			// First click - should set ascending
			const sortButton = screen.getByTitle('Id');
			expect(sortButton).toHaveAttribute('data-sort', 'none');
			fireEvent.click(sortButton);

			// Wait for URL to show ascending
			await waitFor(() => {
				const calls = getOrderByCalls();
				expect(calls.length).toBeGreaterThan(0);
				const parsed = JSON.parse(calls[calls.length - 1]);
				expect(parsed.order).toBe('asc');
			});

			// Wait for button to have ascending state
			await waitFor(() => {
				expect(screen.getByTitle('Id')).toHaveAttribute('data-sort', 'ascending');
			});

			const callsAfterFirstClick = getOrderByCalls().length;

			// Verify only one button exists with title 'Id'
			const allIdButtons = screen.getAllByTitle('Id');
			expect(allIdButtons).toHaveLength(1);

			// Second click - should set descending
			const ascendingButton = screen.getByTitle('Id');
			expect(ascendingButton).toHaveAttribute('data-sort', 'ascending');
			fireEvent.click(ascendingButton);

			// Wait for URL to show descending (must be a new call)
			await waitFor(() => {
				const calls = getOrderByCalls();
				expect(calls.length).toBeGreaterThan(callsAfterFirstClick);
				const parsed = JSON.parse(calls[calls.length - 1]);
				expect(parsed.order).toBe('desc');
			});

			// Verify DOM updated
			await waitFor(() => {
				expect(screen.getByTitle('Id')).toHaveAttribute('data-sort', 'descending');
			});
		});

		it('should update page in URL when clicking pagination', async () => {
			const user = userEvent.setup();

			await waitFor(() => {
				expect(screen.getByText(`PodId:${itemId}`)).toBeInTheDocument();
			});

			// Find pagination navigation and page 2 button
			const nav = screen.getByRole('navigation');
			const page2Button = Array.from(nav.querySelectorAll('button')).find(
				(btn) => btn.textContent?.trim() === '2',
			);
			if (!page2Button) {
				throw new Error('Page 2 button not found in pagination');
			}
			await user.click(page2Button);

			await waitFor(() => {
				const lastPage = onUrlUpdateMock.mock.calls
					.map((call) => call[0].searchParams.get('page'))
					.filter(Boolean)
					.pop();

				expect(lastPage).toBe('2');
			});
		});

		it('should open row in new tab when ctrl+click on row', async () => {
			await waitFor(() => {
				expect(screen.getByText(`PodId:${itemId}`)).toBeInTheDocument();
			});

			const firstRow = screen.getByText(`PodId:${itemId}`);
			// Ctrl+click to open in new tab
			fireEvent.click(firstRow, { ctrlKey: true });

			await waitFor(() => {
				expect(openInNewTabMock).toHaveBeenCalledTimes(1);
				expect(openInNewTabMock).toHaveBeenCalledWith(
					expect.stringContaining(`selectedItem=PodId%3A${itemId}`),
				);
			});
		});

		it('should open row in new tab when meta+click (cmd on Mac) on row', async () => {
			await waitFor(() => {
				expect(screen.getByText(`PodId:${itemId}`)).toBeInTheDocument();
			});

			const firstRow = screen.getByText(`PodId:${itemId}`);
			// Meta+click (cmd on Mac) to open in new tab
			fireEvent.click(firstRow, { metaKey: true });

			await waitFor(() => {
				expect(openInNewTabMock).toHaveBeenCalledTimes(1);
				expect(openInNewTabMock).toHaveBeenCalledWith(
					expect.stringContaining(`selectedItem=PodId%3A${itemId}`),
				);
			});
		});
	});

	describe('with URL params (orderBy, groupBy, pagination)', () => {
		const onUrlUpdateMock = jest.fn<void, [UrlUpdateEvent]>();
		const fetchListDataMock = jest.fn<
			ReturnType<K8sBaseListProps<TestItem>['fetchListData']>,
			Parameters<K8sBaseListProps<TestItem>['fetchListData']>
		>();
		const groupByValue = [
			{ key: 'k8s.namespace.name', dataType: 'string', type: 'resource' },
		];

		beforeEach(() => {
			onUrlUpdateMock.mockClear();
			fetchListDataMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [
					{ id: 'namespace-default', meta: { 'k8s.namespace.name': 'default' } },
				],
				total: 50,
				error: null,
			});

			renderComponent<TestItem>({
				onUrlUpdate: onUrlUpdateMock,
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				queryParams: {
					orderBy: JSON.stringify({ columnName: 'cpu', order: 'desc' }),
					groupBy: JSON.stringify(groupByValue),
					page: '3',
				},
				tableColumns: createTestColumns(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});
		});

		it('should call fetchListData with orderBy/groupBy/offset/limit from URL', async () => {
			await waitFor(() => {
				expect(fetchListDataMock).toHaveBeenCalled();
			});

			const [filters] = fetchListDataMock.mock.calls[0];
			expect(filters.orderBy).toStrictEqual({ columnName: 'cpu', order: 'desc' });
			expect(filters.groupBy).toStrictEqual(groupByValue);
			expect(filters.offset).toBe(20); // (3 - 1) * 10 = 20
			expect(filters.limit).toBe(10);
		});

		it('should render expand icons when groupBy is set', async () => {
			await waitFor(() => {
				expect(screen.getByText('namespace-default')).toBeInTheDocument();
			});

			const expandButtons = screen.getAllByRole('button');
			expect(expandButtons.length).toBeGreaterThan(0);
		});

		it('should render data with groupBy params', async () => {
			await waitFor(() => {
				expect(screen.getByText('namespace-default')).toBeInTheDocument();
			});

			// Verify the call was made with correct groupBy
			const callWithGroupBy = fetchListDataMock.mock.calls.find(
				(c) => c[0].groupBy && c[0].groupBy.length > 0,
			);
			expect(callWithGroupBy).toBeDefined();
			expect(callWithGroupBy?.[0].groupBy).toStrictEqual(groupByValue);
		});
	});

	describe('with empty data', () => {
		const fetchListDataMock = jest.fn<
			ReturnType<K8sBaseListProps<TestItem>['fetchListData']>,
			Parameters<K8sBaseListProps<TestItem>['fetchListData']>
		>();

		beforeEach(() => {
			fetchListDataMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [],
				total: 0,
				error: null,
				rawData: {
					sentAnyHostMetricsData: true,
					isSendingK8SAgentMetrics: false,
				},
			});

			renderComponent<TestItem>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				tableColumns: createTestColumns(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});
		});

		it('should display empty state when no data is returned', async () => {
			await waitFor(() => {
				expect(screen.getByText(/This query had no results/i)).toBeInTheDocument();
			});
		});

		it('should still call fetchListData', async () => {
			await waitFor(() => {
				expect(fetchListDataMock).toHaveBeenCalled();
			});
		});
	});

	describe('with error response', () => {
		const fetchListDataMock = jest.fn<
			ReturnType<K8sBaseListProps<TestItem>['fetchListData']>,
			Parameters<K8sBaseListProps<TestItem>['fetchListData']>
		>();

		beforeEach(() => {
			fetchListDataMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [],
				total: 0,
				error: 'Failed to fetch pods',
			});

			renderComponent<TestItem>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				tableColumns: createTestColumns(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});
		});

		it('should call fetchListData even when error occurs', async () => {
			await waitFor(() => {
				expect(fetchListDataMock).toHaveBeenCalled();
			});
		});

		it('should display error message when data.error is set', async () => {
			await waitFor(() => {
				expect(screen.getByText(/Failed to fetch pods/i)).toBeInTheDocument();
			});
		});
	});

	describe('with no metrics data (sentAnyHostMetricsData=false)', () => {
		const fetchListDataMock = jest.fn<
			ReturnType<K8sBaseListProps<TestItem>['fetchListData']>,
			Parameters<K8sBaseListProps<TestItem>['fetchListData']>
		>();

		beforeEach(() => {
			fetchListDataMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [],
				total: 0,
				error: null,
				rawData: {
					sentAnyHostMetricsData: false,
					isSendingK8SAgentMetrics: false,
				},
			});

			renderComponent<TestItem>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				tableColumns: createTestColumns(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});
		});

		it('should display no metrics data message', async () => {
			await waitFor(() => {
				expect(
					screen.getByText(/No host metrics data received yet/i),
				).toBeInTheDocument();
			});
		});

		it('should display link to documentation', async () => {
			await waitFor(() => {
				const link = screen.getByRole('link', { name: /our documentation/i });
				expect(link).toBeInTheDocument();
				expect(link).toHaveAttribute(
					'href',
					'https://signoz.io/docs/userguide/hostmetrics/',
				);
			});
		});
	});

	describe('with incorrect K8s agent metrics (isSendingK8SAgentMetrics=true)', () => {
		const fetchListDataMock = jest.fn<
			ReturnType<K8sBaseListProps<TestItem>['fetchListData']>,
			Parameters<K8sBaseListProps<TestItem>['fetchListData']>
		>();

		beforeEach(() => {
			fetchListDataMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [],
				total: 0,
				error: null,
				rawData: {
					sentAnyHostMetricsData: true,
					isSendingK8SAgentMetrics: true,
				},
			});

			renderComponent<TestItem>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				tableColumns: createTestColumns(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});
		});

		it('should display upgrade message', async () => {
			await waitFor(() => {
				expect(
					screen.getByText(/upgrade to the latest version of SigNoz k8s-infra/i),
				).toBeInTheDocument();
			});
		});
	});

	describe('with end time before retention (endTimeBeforeRetention=true)', () => {
		const fetchListDataMock = jest.fn<
			ReturnType<K8sBaseListProps<TestItem>['fetchListData']>,
			Parameters<K8sBaseListProps<TestItem>['fetchListData']>
		>();

		beforeEach(() => {
			fetchListDataMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [],
				total: 0,
				error: null,
				rawData: {
					sentAnyHostMetricsData: true,
					isSendingK8SAgentMetrics: false,
					endTimeBeforeRetention: true,
				},
			});

			renderComponent<TestItem>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				tableColumns: createTestColumns(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});
		});

		it('should display time range before retention message', async () => {
			await waitFor(() => {
				expect(
					screen.getByText(/Queried time range is before earliest K8s metrics/i),
				).toBeInTheDocument();
				expect(
					screen.getByText(/please adjust your end time/i),
				).toBeInTheDocument();
			});
		});
	});

	describe('column visibility based on TanStack columns', () => {
		const fetchListDataMock = jest.fn<
			ReturnType<K8sBaseListProps<TestItemWithName>['fetchListData']>,
			Parameters<K8sBaseListProps<TestItemWithName>['fetchListData']>
		>();

		beforeEach(() => {
			fetchListDataMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [{ id: 'item-1', name: 'Item 1', desc: 'Description 1' }],
				total: 1,
				error: null,
			});
		});

		it('should show all columns defined in tableColumns', async () => {
			renderComponent<TestItemWithName>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				tableColumns: createTestColumnsWithName(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});

			await waitFor(() => {
				expect(screen.getByText('item-1')).toBeInTheDocument();
			});

			// All columns should be visible
			expect(
				screen.getByRole('columnheader', { name: /id/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole('columnheader', { name: /name/i }),
			).toBeInTheDocument();
		});
	});

	describe('column behavior with groupBy (expanded/collapsed)', () => {
		const fetchListDataMock = jest.fn<
			ReturnType<K8sBaseListProps<TestItemWithGroup>['fetchListData']>,
			Parameters<K8sBaseListProps<TestItemWithGroup>['fetchListData']>
		>();

		beforeEach(() => {
			fetchListDataMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [
					{
						id: 'item-1',
						name: 'Item 1',
						group: 'Group A',
						meta: { 'k8s.namespace.name': 'default' },
					},
				],
				total: 1,
				error: null,
			});
		});

		it('should show columns when NOT grouped', async () => {
			renderComponent<TestItemWithGroup>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				queryParams: {},
				tableColumns: createTestColumnsWithGroup(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});

			await waitFor(() => {
				expect(screen.getByText('item-1')).toBeInTheDocument();
			});

			// Columns should be visible
			expect(
				screen.getByRole('columnheader', { name: /id/i }),
			).toBeInTheDocument();
		});

		it('should show columns when grouped', async () => {
			const groupByValue = [
				{ key: 'k8s.namespace.name', dataType: 'string', type: 'resource' },
			];

			renderComponent<TestItemWithGroup>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				queryParams: {
					groupBy: JSON.stringify(groupByValue),
				},
				tableColumns: createTestColumnsWithGroup(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});

			await waitFor(() => {
				expect(screen.getByText('item-1')).toBeInTheDocument();
			});

			// Id should be visible
			expect(
				screen.getByRole('columnheader', { name: /id/i }),
			).toBeInTheDocument();
		});
	});

	describe('column visibility in expanded row (nested table)', () => {
		const fetchListDataMock = jest.fn<
			ReturnType<K8sBaseListProps<TestItem>['fetchListData']>,
			Parameters<K8sBaseListProps<TestItem>['fetchListData']>
		>();
		const groupByValue = [
			{ key: 'k8s.namespace.name', dataType: 'string', type: 'resource' },
		];

		beforeEach(() => {
			fetchListDataMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [
					{ id: 'namespace-default', meta: { 'k8s.namespace.name': 'default' } },
				],
				total: 50,
				error: null,
			});

			renderComponent<TestItem>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				queryParams: {
					groupBy: JSON.stringify(groupByValue),
				},
				tableColumns: createTestColumns(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});
		});

		it('should render table with groupBy params and enable expansion', async () => {
			await waitFor(() => {
				expect(screen.getByText('namespace-default')).toBeInTheDocument();
			});

			// Verify fetch was called with groupBy
			const callWithGroupBy = fetchListDataMock.mock.calls.find(
				(c) => c[0].groupBy && c[0].groupBy.length > 0,
			);
			expect(callWithGroupBy).toBeDefined();
		});
	});

	describe('TanStack table column rendering', () => {
		const fetchListDataMock = jest.fn<
			ReturnType<K8sBaseListProps<TestItemWithName>['fetchListData']>,
			Parameters<K8sBaseListProps<TestItemWithName>['fetchListData']>
		>();

		beforeEach(() => {
			fetchListDataMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [
					{ id: 'item-1', name: 'Item 1', desc: 'Description 1' },
					{ id: 'item-2', name: 'Item 2', desc: 'Description 2' },
				],
				total: 2,
				error: null,
			});
		});

		it('should render all defined columns', async () => {
			renderComponent<TestItemWithName>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				tableColumns: createTestColumnsWithName(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});

			await waitFor(() => {
				expect(screen.getByText('item-1')).toBeInTheDocument();
			});

			// All columns should be visible
			expect(
				screen.getByRole('columnheader', { name: /id/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole('columnheader', { name: /^name$/i }),
			).toBeInTheDocument();
		});

		it('should render data in cells correctly', async () => {
			renderComponent<TestItemWithName>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				tableColumns: createTestColumnsWithName(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});

			await waitFor(() => {
				expect(screen.getByText('item-1')).toBeInTheDocument();
				expect(screen.getByText('Item 1')).toBeInTheDocument();
				expect(screen.getByText('item-2')).toBeInTheDocument();
				expect(screen.getByText('Item 2')).toBeInTheDocument();
			});
		});
	});
});
