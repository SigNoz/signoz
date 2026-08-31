import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { MemoryRouter as MemoryRouterV5 } from 'react-router-dom-v5-compat';
import { VirtuosoMockContext } from 'react-virtuoso';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InfraMonitoringEvents } from 'constants/events';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import {
	NuqsTestingAdapter,
	OnUrlUpdateFunction,
	UrlUpdateEvent,
} from 'nuqs/adapters/testing';
import { AppProvider } from 'providers/App/App';
import TimezoneProvider from 'providers/Timezone';
import store from 'store';
import APIError from 'types/api/error';
import { openInNewTab } from 'utils/navigation';

import { TableColumnDef } from 'components/TanStackTableView';

import { InfraMonitoringEntity } from '../../constants';
import { SelectedItemParams } from '../../hooks';

window.ResizeObserver =
	window.ResizeObserver ||
	jest.fn().mockImplementation(() => ({
		disconnect: jest.fn(),
		observe: jest.fn(),
		unobserve: jest.fn(),
	}));

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
jest.mock('@signozhq/ui/drawer', () => {
	const actual = jest.requireActual('@signozhq/ui/drawer');
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
function renderComponent<
	T extends K8sEntityData,
	TItemKey extends string | SelectedItemParams = string,
>({
	queryParams,
	onUrlUpdate,
	detailsQueryKeyPrefix = 'testEntity',
	...props
}: Omit<K8sBaseListProps<T, TItemKey>, 'detailsQueryKeyPrefix'> & {
	detailsQueryKeyPrefix?: string;
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
											<K8sBaseList<T, TItemKey>
												{...props}
												detailsQueryKeyPrefix={detailsQueryKeyPrefix}
											/>
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
			ReturnType<
				NonNullable<K8sBaseListProps<TestItemWithTitle>['fetchListData']>
			>,
			Parameters<NonNullable<K8sBaseListProps<TestItemWithTitle>['fetchListData']>>
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
			expect(filters.filter).toStrictEqual({
				expression: '',
				filterByStatus: undefined,
			});
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

	describe('with URL params (orderBy, groupBy old format, pagination)', () => {
		const onUrlUpdateMock = jest.fn<void, [UrlUpdateEvent]>();
		const fetchListDataMock = jest.fn<
			ReturnType<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>,
			Parameters<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>
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
			expect(filters.orderBy).toStrictEqual({
				key: { name: 'cpu' },
				direction: 'desc',
			});
			expect(filters.groupBy).toStrictEqual([{ name: 'k8s.namespace.name' }]);
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
			expect(callWithGroupBy?.[0].groupBy).toStrictEqual([
				{ name: 'k8s.namespace.name' },
			]);
		});
	});

	describe('with URL params (groupBy new format - string array)', () => {
		const onUrlUpdateMock = jest.fn<void, [UrlUpdateEvent]>();
		const fetchListDataMock = jest.fn<
			ReturnType<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>,
			Parameters<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>
		>();
		const groupByValue = ['k8s.namespace.name'];

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

		it('should call fetchListData with groupBy from new format URL', async () => {
			await waitFor(() => {
				expect(fetchListDataMock).toHaveBeenCalled();
			});

			const [filters] = fetchListDataMock.mock.calls[0];
			expect(filters.groupBy).toStrictEqual([{ name: 'k8s.namespace.name' }]);
		});

		it('should render expand icons when groupBy is set with new format', async () => {
			await waitFor(() => {
				expect(screen.getByText('namespace-default')).toBeInTheDocument();
			});

			const expandButtons = screen.getAllByRole('button');
			expect(expandButtons.length).toBeGreaterThan(0);
		});

		it('should render data with new groupBy format', async () => {
			await waitFor(() => {
				expect(screen.getByText('namespace-default')).toBeInTheDocument();
			});

			const callWithGroupBy = fetchListDataMock.mock.calls.find(
				(c) => c[0].groupBy && c[0].groupBy.length > 0,
			);
			expect(callWithGroupBy).toBeDefined();
			expect(callWithGroupBy?.[0].groupBy).toStrictEqual([
				{ name: 'k8s.namespace.name' },
			]);
		});
	});

	describe('with empty data', () => {
		const onUrlUpdateMock = jest.fn<void, [UrlUpdateEvent]>();
		const fetchListDataMock = jest.fn<
			ReturnType<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>,
			Parameters<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>
		>();

		beforeEach(() => {
			onUrlUpdateMock.mockClear();
			fetchListDataMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [],
				total: 0,
				error: null,
			});

			renderComponent<TestItem>({
				onUrlUpdate: onUrlUpdateMock,
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

		it('should not rewrite the page when already on the first page', async () => {
			await waitFor(() => {
				expect(fetchListDataMock).toHaveBeenCalled();
			});

			const pageUpdates = onUrlUpdateMock.mock.calls
				.map((call) => call[0].searchParams.get('page'))
				.filter(Boolean);

			expect(pageUpdates).toHaveLength(0);
		});
	});

	describe('with a page beyond the end of the list', () => {
		const onUrlUpdateMock = jest.fn<void, [UrlUpdateEvent]>();
		const fetchListDataMock = jest.fn<
			ReturnType<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>,
			Parameters<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>
		>();

		// 25 rows exist, so pages 1-3 serve data and page 7 of 10 comes back empty.
		const rows: TestItem[] = Array.from({ length: 25 }, (_, index) => ({
			id: `pod-${index + 1}`,
		}));

		beforeEach(() => {
			onUrlUpdateMock.mockClear();
			fetchListDataMock.mockClear();
			// Offset-aware on purpose: a mock that answers empty for every offset would let
			// the assertions pass against a page the recovery has already moved on from.
			fetchListDataMock.mockImplementation(async ({ offset = 0, limit = 10 }) => ({
				data: rows.slice(offset, offset + limit),
				total: rows.length,
				error: null,
			}));

			renderComponent<TestItem>({
				onUrlUpdate: onUrlUpdateMock,
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				queryParams: { page: '7', pageSize: '10' },
				tableColumns: createTestColumns(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});
		});

		it('should send the user back to the last page holding data', async () => {
			// The rows of page 3 on screen are what proves the recovery settled there,
			// rather than passing through on its way somewhere else.
			await expect(screen.findByText('pod-21')).resolves.toBeInTheDocument();

			const pageUpdates = onUrlUpdateMock.mock.calls
				.map((call) => call[0].searchParams.get('page'))
				.filter(Boolean);

			expect(pageUpdates).toStrictEqual(['3']);
		});

		it('should correct the page in a single hop', async () => {
			await expect(screen.findByText('pod-21')).resolves.toBeInTheDocument();

			// Only the original out-of-range page and the corrected one are requested.
			expect(
				fetchListDataMock.mock.calls.map((call) => call[0].offset),
			).toStrictEqual([60, 20]);
		});

		it('should replace the history entry instead of pushing the correction', async () => {
			await expect(screen.findByText('pod-21')).resolves.toBeInTheDocument();

			const pageCorrection = onUrlUpdateMock.mock.calls.find(
				(call) => call[0].searchParams.get('page') === '3',
			);

			expect(pageCorrection?.[0].options.history).toBe('replace');
		});
	});

	describe('with a page below the first one', () => {
		const onUrlUpdateMock = jest.fn<void, [UrlUpdateEvent]>();
		const fetchListDataMock = jest.fn<
			ReturnType<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>,
			Parameters<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>
		>();

		beforeEach(() => {
			onUrlUpdateMock.mockClear();
			fetchListDataMock.mockClear();
			// page=0 turns into offset=-10, which the API rejects outright — the list
			// can only recover by clamping the page, never by reading the response.
			fetchListDataMock.mockImplementation(async ({ offset = 0 }) => {
				if (offset < 0) {
					throw new APIError({
						httpStatusCode: 400,
						error: {
							code: 'invalid_input',
							message: 'offset cannot be negative',
							url: '',
							errors: [],
						},
					});
				}

				return { data: [{ id: 'pod-1' }], total: 1, error: null };
			});

			renderComponent<TestItem>({
				onUrlUpdate: onUrlUpdateMock,
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				queryParams: { page: '0', pageSize: '10' },
				tableColumns: createTestColumns(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});
		});

		it('should reject the request that carried the negative offset', async () => {
			await waitFor(() => {
				expect(
					fetchListDataMock.mock.calls.some((call) => call[0].offset === -10),
				).toBe(true);
			});

			await expect(
				fetchListDataMock.mock.results[0].value as Promise<unknown>,
			).rejects.toThrow('offset cannot be negative');
		});

		it('should clamp the page to the first one even though the request failed', async () => {
			await waitFor(() => {
				expect(onUrlUpdateMock).toHaveBeenCalled();
			});

			// Page 1 is the default, so the correction drops the param rather than
			// writing `page=1`.
			const pageCorrection = onUrlUpdateMock.mock.calls.find(
				(call) => call[0].searchParams.get('page') === null,
			);

			expect(pageCorrection).toBeDefined();
			expect(pageCorrection?.[0].queryString).toBe('?pageSize=10');
		});

		it('should replace the history entry instead of pushing the correction', async () => {
			await waitFor(() => {
				expect(onUrlUpdateMock).toHaveBeenCalled();
			});

			const pageCorrection = onUrlUpdateMock.mock.calls.find(
				(call) => call[0].searchParams.get('page') === null,
			);

			expect(pageCorrection?.[0].options.history).toBe('replace');
		});

		it('should refetch with a non-negative offset after clamping', async () => {
			await waitFor(() => {
				expect(
					fetchListDataMock.mock.calls.some((call) => call[0].offset === 0),
				).toBe(true);
			});

			await waitFor(() => {
				expect(screen.getByText('pod-1')).toBeInTheDocument();
			});
		});
	});

	describe('with error response', () => {
		const fetchListDataMock = jest.fn<
			ReturnType<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>,
			Parameters<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>
		>();

		beforeEach(() => {
			fetchListDataMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [],
				total: 0,
				error: new APIError({
					httpStatusCode: 500,
					error: {
						code: '500',
						message: 'Failed to fetch pods',
						url: '',
						errors: [],
					},
				}),
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

	describe('with end time before retention (endTimeBeforeRetention=true)', () => {
		const fetchListDataMock = jest.fn<
			ReturnType<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>,
			Parameters<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>
		>();

		beforeEach(() => {
			fetchListDataMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [],
				total: 0,
				error: null,
				endTimeBeforeRetention: true,
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
			ReturnType<NonNullable<K8sBaseListProps<TestItemWithName>['fetchListData']>>,
			Parameters<NonNullable<K8sBaseListProps<TestItemWithName>['fetchListData']>>
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
			ReturnType<
				NonNullable<K8sBaseListProps<TestItemWithGroup>['fetchListData']>
			>,
			Parameters<NonNullable<K8sBaseListProps<TestItemWithGroup>['fetchListData']>>
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
			ReturnType<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>,
			Parameters<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>
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
			ReturnType<NonNullable<K8sBaseListProps<TestItemWithName>['fetchListData']>>,
			Parameters<NonNullable<K8sBaseListProps<TestItemWithName>['fetchListData']>>
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

	describe('with warnings from API', () => {
		const fetchListDataMock = jest.fn<
			ReturnType<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>,
			Parameters<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>
		>();

		beforeEach(() => {
			fetchListDataMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [{ id: 'item-1' }],
				total: 1,
				error: null,
				warning: {
					message: 'Some data may be incomplete',
					url: 'https://docs.example.com/partial-data',
					warnings: [{ message: 'Node xyz did not report metrics' }],
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

		it('should render warning popover in pagination area', async () => {
			await waitFor(() => {
				expect(screen.getByTestId('k8s-list-warning-popover')).toBeInTheDocument();
			});
		});
	});

	describe('with object itemKey (selectedItem + cluster + namespace params)', () => {
		const itemId = 'obj-item';
		const onUrlUpdateMock = jest.fn<void, [UrlUpdateEvent]>();
		const fetchListDataMock = jest.fn<
			ReturnType<
				NonNullable<K8sBaseListProps<TestItemWithTitle>['fetchListData']>
			>,
			Parameters<NonNullable<K8sBaseListProps<TestItemWithTitle>['fetchListData']>>
		>();

		const getLatestParam = (key: string): string | undefined =>
			onUrlUpdateMock.mock.calls
				.map((call) => call[0].searchParams.get(key))
				.filter(Boolean)
				.pop() as string | undefined;

		beforeEach(() => {
			onUrlUpdateMock.mockClear();
			fetchListDataMock.mockClear();
			openInNewTabMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [{ id: `PodId:${itemId}`, title: `PodTitle:${itemId}` }],
				total: 1,
				error: null,
			});
		});

		it('should set selectedItem, cluster and namespace params on row click', async () => {
			const user = userEvent.setup();

			renderComponent<TestItemWithTitle, SelectedItemParams>({
				onUrlUpdate: onUrlUpdateMock,
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				tableColumns: createTestColumnsWithTitle(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): SelectedItemParams => ({
					selectedItem: row.id,
					clusterName: 'prod-cluster',
					namespaceName: 'default-ns',
				}),
			});

			const firstRowEl = await screen.findByText(`PodId:${itemId}`);
			await user.click(firstRowEl);

			await waitFor(() => {
				expect(getLatestParam('selectedItem')).toBe(`PodId:${itemId}`);
				expect(getLatestParam('selectedItemClusterName')).toBe('prod-cluster');
				expect(getLatestParam('selectedItemNamespaceName')).toBe('default-ns');
			});
		});

		it('should include cluster and namespace params in new tab URL on ctrl+click', async () => {
			renderComponent<TestItemWithTitle, SelectedItemParams>({
				onUrlUpdate: onUrlUpdateMock,
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				tableColumns: createTestColumnsWithTitle(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): SelectedItemParams => ({
					selectedItem: row.id,
					clusterName: 'prod-cluster',
					namespaceName: 'default-ns',
				}),
			});

			const firstRow = await screen.findByText(`PodId:${itemId}`);
			fireEvent.click(firstRow, { ctrlKey: true });

			await waitFor(() => {
				expect(openInNewTabMock).toHaveBeenCalledTimes(1);
			});
			const url = openInNewTabMock.mock.calls[0][0] as string;
			expect(url).toContain(`selectedItem=PodId%3A${itemId}`);
			expect(url).toContain('selectedItemClusterName=prod-cluster');
			expect(url).toContain('selectedItemNamespaceName=default-ns');
		});

		it('should omit null cluster/namespace params in new tab URL', async () => {
			renderComponent<TestItemWithTitle, SelectedItemParams>({
				onUrlUpdate: onUrlUpdateMock,
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				tableColumns: createTestColumnsWithTitle(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): SelectedItemParams => ({
					selectedItem: row.id,
					clusterName: null,
					namespaceName: null,
				}),
			});

			const firstRow = await screen.findByText(`PodId:${itemId}`);
			fireEvent.click(firstRow, { ctrlKey: true });

			await waitFor(() => {
				expect(openInNewTabMock).toHaveBeenCalledTimes(1);
			});
			const url = openInNewTabMock.mock.calls[0][0] as string;
			expect(url).toContain(`selectedItem=PodId%3A${itemId}`);
			expect(url).not.toContain('selectedItemClusterName');
			expect(url).not.toContain('selectedItemNamespaceName');
		});
	});

	describe('instrumentation checks callout', () => {
		const fetchListDataMock = jest.fn<
			ReturnType<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>,
			Parameters<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>
		>();

		beforeEach(() => {
			fetchListDataMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [{ id: 'item-1' }],
				total: 1,
				error: null,
			});
		});

		it('should not render callout when ready is true', async () => {
			server.use(
				rest.get('http://localhost/api/v2/infra_monitoring/checks', (_, res, ctx) =>
					res(
						ctx.json({
							status: 'success',
							data: {
								ready: true,
								type: 'pods',
								presentDefaultEnabledMetrics: [
									{
										associatedComponent: { name: 'otel-collector' },
										metrics: ['k8s.pod.cpu.usage'],
									},
								],
							},
						}),
					),
				),
			);

			renderComponent<TestItem>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				tableColumns: createTestColumns(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});

			await screen.findByText('item-1');

			expect(screen.queryByText('Instrumentation checks')).not.toBeInTheDocument();
		});

		it('should not render callout when no entries exist', async () => {
			server.use(
				rest.get('http://localhost/api/v2/infra_monitoring/checks', (_, res, ctx) =>
					res(
						ctx.json({
							status: 'success',
							data: {
								ready: false,
								type: 'pods',
								presentDefaultEnabledMetrics: null,
								presentOptionalMetrics: null,
								presentRequiredAttributes: null,
								missingDefaultEnabledMetrics: null,
								missingOptionalMetrics: null,
								missingRequiredAttributes: null,
							},
						}),
					),
				),
			);

			renderComponent<TestItem>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				tableColumns: createTestColumns(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});

			await screen.findByText('item-1');

			expect(screen.queryByText('Instrumentation checks')).not.toBeInTheDocument();
		});

		it('should render callout with present entries', async () => {
			server.use(
				rest.get('http://localhost/api/v2/infra_monitoring/checks', (_, res, ctx) =>
					res(
						ctx.json({
							status: 'success',
							data: {
								ready: false,
								type: 'pods',
								presentDefaultEnabledMetrics: [
									{
										associatedComponent: { name: 'otel-collector' },
										metrics: ['k8s.pod.cpu.usage', 'k8s.pod.memory.usage'],
									},
								],
								presentOptionalMetrics: null,
								presentRequiredAttributes: null,
								missingDefaultEnabledMetrics: null,
								missingOptionalMetrics: null,
								missingRequiredAttributes: null,
							},
						}),
					),
				),
			);

			renderComponent<TestItem>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				tableColumns: createTestColumns(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});

			await screen.findByText('Instrumentation checks');

			await expect(
				screen.findByText('Default enabled metrics'),
			).resolves.toBeInTheDocument();
			await expect(
				screen.findByText('k8s.pod.cpu.usage, k8s.pod.memory.usage'),
			).resolves.toBeInTheDocument();
			await expect(
				screen.findByText('otel-collector'),
			).resolves.toBeInTheDocument();
		});

		it('should render callout with missing entries', async () => {
			server.use(
				rest.get('http://localhost/api/v2/infra_monitoring/checks', (_, res, ctx) =>
					res(
						ctx.json({
							status: 'success',
							data: {
								ready: false,
								type: 'pods',
								presentDefaultEnabledMetrics: null,
								presentOptionalMetrics: null,
								presentRequiredAttributes: null,
								missingDefaultEnabledMetrics: [
									{
										associatedComponent: { name: 'otel-collector' },
										metrics: ['k8s.pod.cpu.limit'],
										documentationLink: 'https://example.com/docs',
									},
								],
								missingOptionalMetrics: null,
								missingRequiredAttributes: null,
							},
						}),
					),
				),
			);

			renderComponent<TestItem>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				tableColumns: createTestColumns(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});

			await screen.findByText('Instrumentation checks');

			await expect(
				screen.findByText('Missing default metrics'),
			).resolves.toBeInTheDocument();
			await expect(
				screen.findByText('k8s.pod.cpu.limit'),
			).resolves.toBeInTheDocument();
			await expect(screen.findByText('Learn here')).resolves.toBeInTheDocument();
		});

		it('should trigger recheck on button click', async () => {
			let recheckCallCount = 0;
			server.use(
				rest.get(
					'http://localhost/api/v2/infra_monitoring/checks',
					(_, res, ctx) => {
						recheckCallCount++;
						return res(
							ctx.json({
								status: 'success',
								data: {
									ready: false,
									type: 'pods',
									presentDefaultEnabledMetrics: [
										{
											associatedComponent: { name: 'otel-collector' },
											metrics: ['k8s.pod.cpu.usage'],
										},
									],
								},
							}),
						);
					},
				),
			);

			const user = userEvent.setup();

			renderComponent<TestItem>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				tableColumns: createTestColumns(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});

			await screen.findByText('Instrumentation checks');

			const initialCallCount = recheckCallCount;

			const recheckBtn = screen.getByTestId('instrumentation-checks-recheck-btn');
			await user.click(recheckBtn);

			await waitFor(() => {
				expect(recheckCallCount).toBeGreaterThan(initialCallCount);
			});
		});

		it('should render both present and missing entries', async () => {
			server.use(
				rest.get('http://localhost/api/v2/infra_monitoring/checks', (_, res, ctx) =>
					res(
						ctx.json({
							status: 'success',
							data: {
								ready: false,
								type: 'pods',
								presentDefaultEnabledMetrics: [
									{
										associatedComponent: { name: 'otel-collector' },
										metrics: ['k8s.pod.cpu.usage'],
									},
								],
								presentOptionalMetrics: null,
								presentRequiredAttributes: [
									{
										associatedComponent: { name: 'otel-collector' },
										attributes: ['k8s.namespace.name'],
									},
								],
								missingDefaultEnabledMetrics: [
									{
										associatedComponent: { name: 'otel-collector' },
										metrics: ['k8s.pod.memory.limit'],
									},
								],
								missingOptionalMetrics: null,
								missingRequiredAttributes: null,
							},
						}),
					),
				),
			);

			renderComponent<TestItem>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				tableColumns: createTestColumns(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});

			await screen.findByText('Instrumentation checks');

			// Present entries
			await expect(
				screen.findByText('Default enabled metrics'),
			).resolves.toBeInTheDocument();
			await expect(
				screen.findByText('k8s.pod.cpu.usage'),
			).resolves.toBeInTheDocument();
			await expect(
				screen.findByText('Required attributes'),
			).resolves.toBeInTheDocument();
			await expect(
				screen.findByText('k8s.namespace.name'),
			).resolves.toBeInTheDocument();

			// Missing entries
			await expect(
				screen.findByText('Missing default metrics'),
			).resolves.toBeInTheDocument();
			await expect(
				screen.findByText('k8s.pod.memory.limit'),
			).resolves.toBeInTheDocument();
		});
	});

	describe('groupBy change clears orderBy', () => {
		const onUrlUpdateMock = jest.fn<void, [UrlUpdateEvent]>();
		const fetchListDataMock = jest.fn<
			ReturnType<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>,
			Parameters<NonNullable<K8sBaseListProps<TestItem>['fetchListData']>>
		>();

		beforeEach(() => {
			onUrlUpdateMock.mockClear();
			fetchListDataMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [{ id: 'item-1' }],
				total: 1,
				error: null,
			});

			server.use(
				rest.get('http://localhost/api/v2/infra_monitoring/checks', (_, res, ctx) =>
					res(ctx.json({ status: 'success', data: { ready: true } })),
				),
				rest.get('http://localhost/api/v1/fields/keys', (_, res, ctx) =>
					res(
						ctx.json({
							status: 'success',
							data: {
								keys: {
									resource: [{ name: 'k8s.namespace.name' }],
								},
							},
						}),
					),
				),
			);
		});

		it('should clear orderBy for name columns when groupBy is changed', async () => {
			const user = userEvent.setup();

			renderComponent<TestItem>({
				onUrlUpdate: onUrlUpdateMock,
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				queryParams: {
					// k8s.pod.name is a name column - should be cleared
					orderBy: JSON.stringify({ columnName: 'k8s.pod.name', order: 'desc' }),
				},
				tableColumns: createTestColumns(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});

			await waitFor(() => {
				expect(screen.getByTestId('k8s-table-group-by')).toBeInTheDocument();
			});

			// Open group by dropdown using testId
			const groupByContainer = screen.getByTestId('k8s-table-group-by-select');
			const groupBySelect = groupByContainer.querySelector(
				'.ant-select-selector',
			) as Element;
			await user.click(groupBySelect);

			// Wait for options to load and click on the namespace option
			const namespaceOption = await screen.findByTitle('k8s.namespace.name');
			await user.click(namespaceOption);

			// Verify orderBy was cleared (set to null) for name column
			await waitFor(() => {
				const orderByCalls = onUrlUpdateMock.mock.calls
					.map((call) => call[0].searchParams.get('orderBy'))
					.filter((v) => v !== undefined);

				const hasOrderByCleared = orderByCalls.some((v) => v === null);
				expect(hasOrderByCleared).toBe(true);
			});
		});

		it('should keep orderBy for non-name columns when groupBy is changed', async () => {
			const user = userEvent.setup();

			renderComponent<TestItem>({
				onUrlUpdate: onUrlUpdateMock,
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				queryParams: {
					// cpu is NOT a name column - should be kept
					orderBy: JSON.stringify({ columnName: 'cpu', order: 'desc' }),
				},
				tableColumns: createTestColumns(),
				getRowKey: (row): string => row.id,
				getItemKey: (row): string => row.id,
			});

			await waitFor(() => {
				expect(screen.getByTestId('k8s-table-group-by')).toBeInTheDocument();
			});

			// Open group by dropdown using testId
			const groupByContainer = screen.getByTestId('k8s-table-group-by-select');
			const groupBySelect = groupByContainer.querySelector(
				'.ant-select-selector',
			) as Element;
			await user.click(groupBySelect);

			// Wait for options to load and click on the namespace option
			const namespaceOption = await screen.findByTitle('k8s.namespace.name');
			await user.click(namespaceOption);

			// Verify orderBy was NOT cleared for non-name column
			await waitFor(() => {
				const orderByCalls = onUrlUpdateMock.mock.calls
					.map((call) => call[0].searchParams.get('orderBy'))
					.filter((v) => v !== undefined);

				// orderBy should never be set to null
				const hasOrderByCleared = orderByCalls.some((v) => v === null);
				expect(hasOrderByCleared).toBe(false);
			});
		});
	});
});
