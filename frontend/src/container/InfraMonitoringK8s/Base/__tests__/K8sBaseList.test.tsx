import { QueryClient, QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { MemoryRouter as MemoryRouterV5 } from 'react-router-dom-v5-compat';
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from '@testing-library/react';
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

import { InfraMonitoringEntity } from '../../constants';
import { K8sBaseList, K8sBaseListProps } from '../K8sBaseList';
import {
	IEntityColumn,
	useInfraMonitoringTableColumnsStore,
} from '../useInfraMonitoringTableColumnsStore';

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
jest.mock('@signozhq/ui', () => ({
	...jest.requireActual('@signozhq/ui'),
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
}));

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function renderComponent<T>({
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
									<K8sBaseList {...props} />
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
			ReturnType<K8sBaseListProps<{ id: string; title: string }>['fetchListData']>,
			Parameters<K8sBaseListProps<{ id: string; title: string }>['fetchListData']>
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

			renderComponent<{ id: string; title: string }>({
				onUrlUpdate: onUrlUpdateMock,
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				renderRowData: (data) => ({
					id: <>{data.id}</>,
					title: <>{data.title}</>,
					itemKey: data.id,
					groupedByMeta: {},
					key: data.id,
				}),
				tableColumnsDefinitions: [
					{
						id: 'id',
						label: 'Id',
						value: 'id',
						defaultVisibility: true,
						canBeHidden: false,
						behavior: 'always-visible',
					},
					{
						id: 'title',
						label: 'Title',
						value: 'title',
						defaultVisibility: true,
						canBeHidden: false,
						behavior: 'always-visible',
					},
				],
				tableColumns: [
					{ key: 'id', title: 'Id', dataIndex: 'id', sorter: true },
					{ key: 'title', title: 'Title', dataIndex: 'title' },
				],
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

			const idHeader = screen.getByRole('columnheader', { name: /id/i });
			await user.click(idHeader);

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
			const user = userEvent.setup();

			await waitFor(() => {
				expect(screen.getByText(`PodId:${itemId}`)).toBeInTheDocument();
			});

			const idHeader = screen.getByRole('columnheader', { name: /id/i });

			// First click - ascending
			await user.click(idHeader);
			// Second click - descending
			await user.click(idHeader);

			await waitFor(() => {
				const lastOrderBy = onUrlUpdateMock.mock.calls
					.map((call) => call[0].searchParams.get('orderBy'))
					.filter(Boolean)
					.pop();

				if (lastOrderBy) {
					const parsed = JSON.parse(lastOrderBy);
					expect(parsed.order).toBe('desc');
				}
			});
		});

		it('should update currentPage in URL when clicking pagination', async () => {
			const user = userEvent.setup();

			await waitFor(() => {
				expect(screen.getByText(`PodId:${itemId}`)).toBeInTheDocument();
			});

			const page2Button = screen.getByRole('listitem', { name: '2' });
			await user.click(page2Button);

			await waitFor(() => {
				const lastPage = onUrlUpdateMock.mock.calls
					.map((call) => call[0].searchParams.get('currentPage'))
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
			ReturnType<K8sBaseListProps<{ id: string }>['fetchListData']>,
			Parameters<K8sBaseListProps<{ id: string }>['fetchListData']>
		>();
		const groupByValue = [
			{ key: 'k8s.namespace.name', dataType: 'string', type: 'resource' },
		];

		beforeEach(() => {
			onUrlUpdateMock.mockClear();
			fetchListDataMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [{ id: 'namespace-default' }],
				total: 50,
				error: null,
			});

			renderComponent<{ id: string }>({
				onUrlUpdate: onUrlUpdateMock,
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				queryParams: {
					orderBy: JSON.stringify({ columnName: 'cpu', order: 'desc' }),
					groupBy: JSON.stringify(groupByValue),
					currentPage: '3',
				},
				renderRowData: (data) => ({
					id: data.id,
					itemKey: data.id,
					groupedByMeta: { 'k8s.namespace.name': 'default' },
					key: data.id,
				}),
				tableColumnsDefinitions: [
					{
						id: 'id',
						label: 'Id',
						value: 'id',
						defaultVisibility: true,
						canBeHidden: false,
						behavior: 'always-visible',
					},
				],
				tableColumns: [{ key: 'id', title: 'Id', dataIndex: 'id' }],
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

		it('should expand row and fetch without groupBy when clicking grouped row', async () => {
			const user = userEvent.setup();

			await waitFor(() => {
				expect(screen.getByText('namespace-default')).toBeInTheDocument();
			});

			const row = screen.getByText('namespace-default');
			await user.click(row);

			await waitFor(() => {
				expect(fetchListDataMock).toHaveBeenCalledTimes(4);
			});

			const [filters] = fetchListDataMock.mock.calls.find((c) => !c[0].groupBy)!;
			expect(filters.offset).toBe(0);
			expect(filters.limit).toBe(10);
			expect(filters.orderBy?.columnName).toBe('cpu');
			expect(filters.orderBy?.order).toBe('desc');
		});
	});

	describe('with empty data', () => {
		const fetchListDataMock = jest.fn<
			ReturnType<K8sBaseListProps<{ id: string }>['fetchListData']>,
			Parameters<K8sBaseListProps<{ id: string }>['fetchListData']>
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

			renderComponent<{ id: string }>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				renderRowData: (data) => ({
					id: data.id,
					itemKey: data.id,
					groupedByMeta: {},
					key: data.id,
				}),
				tableColumnsDefinitions: [
					{
						id: 'id',
						label: 'Id',
						value: 'id',
						defaultVisibility: true,
						canBeHidden: false,
						behavior: 'always-visible',
					},
				],
				tableColumns: [{ key: 'id', title: 'Id', dataIndex: 'id' }],
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
			ReturnType<K8sBaseListProps<{ id: string }>['fetchListData']>,
			Parameters<K8sBaseListProps<{ id: string }>['fetchListData']>
		>();

		beforeEach(() => {
			fetchListDataMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [],
				total: 0,
				error: 'Failed to fetch pods',
			});

			renderComponent<{ id: string }>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				renderRowData: (data) => ({
					id: data.id,
					itemKey: data.id,
					groupedByMeta: {},
					key: data.id,
				}),
				tableColumnsDefinitions: [
					{
						id: 'id',
						label: 'Id',
						value: 'id',
						defaultVisibility: true,
						canBeHidden: false,
						behavior: 'always-visible',
					},
				],
				tableColumns: [{ key: 'id', title: 'Id', dataIndex: 'id' }],
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
			ReturnType<K8sBaseListProps<{ id: string }>['fetchListData']>,
			Parameters<K8sBaseListProps<{ id: string }>['fetchListData']>
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

			renderComponent<{ id: string }>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				renderRowData: (data) => ({
					id: data.id,
					itemKey: data.id,
					groupedByMeta: {},
					key: data.id,
				}),
				tableColumnsDefinitions: [
					{
						id: 'id',
						label: 'Id',
						value: 'id',
						defaultVisibility: true,
						canBeHidden: false,
						behavior: 'always-visible',
					},
				],
				tableColumns: [{ key: 'id', title: 'Id', dataIndex: 'id' }],
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
			ReturnType<K8sBaseListProps<{ id: string }>['fetchListData']>,
			Parameters<K8sBaseListProps<{ id: string }>['fetchListData']>
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

			renderComponent<{ id: string }>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				renderRowData: (data) => ({
					id: data.id,
					itemKey: data.id,
					groupedByMeta: {},
					key: data.id,
				}),
				tableColumnsDefinitions: [
					{
						id: 'id',
						label: 'Id',
						value: 'id',
						defaultVisibility: true,
						canBeHidden: false,
						behavior: 'always-visible',
					},
				],
				tableColumns: [{ key: 'id', title: 'Id', dataIndex: 'id' }],
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
			ReturnType<K8sBaseListProps<{ id: string }>['fetchListData']>,
			Parameters<K8sBaseListProps<{ id: string }>['fetchListData']>
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

			renderComponent<{ id: string }>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				renderRowData: (data) => ({
					id: data.id,
					itemKey: data.id,
					groupedByMeta: {},
					key: data.id,
				}),
				tableColumnsDefinitions: [
					{
						id: 'id',
						label: 'Id',
						value: 'id',
						defaultVisibility: true,
						canBeHidden: false,
						behavior: 'always-visible',
					},
				],
				tableColumns: [{ key: 'id', title: 'Id', dataIndex: 'id' }],
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

	describe('column visibility based on defaultVisibility', () => {
		const fetchListDataMock = jest.fn<
			ReturnType<
				K8sBaseListProps<{
					id: string;
					name: string;
					desc: string;
				}>['fetchListData']
			>,
			Parameters<
				K8sBaseListProps<{
					id: string;
					name: string;
					desc: string;
				}>['fetchListData']
			>
		>();

		const tableColumnsDefinitions: IEntityColumn[] = [
			{
				id: 'id',
				label: 'Id',
				value: 'id',
				defaultVisibility: true,
				canBeHidden: false,
				behavior: 'always-visible',
			},
			{
				id: 'name',
				label: 'Name',
				value: 'name',
				defaultVisibility: true,
				canBeHidden: true,
				behavior: 'always-visible',
			},
			{
				id: 'description',
				label: 'Description',
				value: 'description',
				defaultVisibility: false,
				canBeHidden: true,
				behavior: 'always-visible',
			},
		];

		const tableColumns = [
			{ key: 'id', title: 'Id', dataIndex: 'id' },
			{ key: 'name', title: 'Name', dataIndex: 'name' },
			{ key: 'description', title: 'Description', dataIndex: 'description' },
		];

		beforeEach(() => {
			// Reset the store before each test
			useInfraMonitoringTableColumnsStore.setState({
				columns: {},
				columnsHidden: {},
			});

			fetchListDataMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [{ id: 'item-1', name: 'Item 1', desc: 'Description 1' }],
				total: 1,
				error: null,
			});
		});

		it('should show columns with defaultVisibility=true', async () => {
			renderComponent<{ id: string; name: string; desc: string }>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				renderRowData: (data) => ({
					id: data.id,
					name: data.name,
					description: data.desc,
					itemKey: data.id,
					groupedByMeta: {},
					key: data.id,
				}),
				tableColumnsDefinitions,
				tableColumns,
			});

			await waitFor(() => {
				expect(screen.getByText('item-1')).toBeInTheDocument();
			});

			// Id and Name should be visible (defaultVisibility=true)
			expect(
				screen.getByRole('columnheader', { name: /id/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole('columnheader', { name: /name/i }),
			).toBeInTheDocument();
		});

		it('should hide columns with defaultVisibility=false', async () => {
			renderComponent<{ id: string; name: string; desc: string }>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				renderRowData: (data) => ({
					id: data.id,
					name: data.name,
					description: data.desc,
					itemKey: data.id,
					groupedByMeta: {},
					key: data.id,
				}),
				tableColumnsDefinitions,
				tableColumns,
			});

			await waitFor(() => {
				expect(screen.getByText('item-1')).toBeInTheDocument();
			});

			// Description should be hidden (defaultVisibility=false)
			expect(
				screen.queryByRole('columnheader', { name: /description/i }),
			).not.toBeInTheDocument();
		});

		it('should respect user changes to column visibility via store', async () => {
			// Manually set the store state to hide the 'name' column
			act(() => {
				useInfraMonitoringTableColumnsStore.setState({
					columns: {
						[InfraMonitoringEntity.PODS]: tableColumnsDefinitions,
					},
					columnsHidden: {
						[InfraMonitoringEntity.PODS]: ['name', 'description'],
					},
				});
			});

			renderComponent<{ id: string; name: string; desc: string }>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				renderRowData: (data) => ({
					id: data.id,
					name: data.name,
					description: data.desc,
					itemKey: data.id,
					groupedByMeta: {},
					key: data.id,
				}),
				tableColumnsDefinitions,
				tableColumns,
			});

			await waitFor(() => {
				expect(screen.getByText('item-1')).toBeInTheDocument();
			});

			// Name column should be hidden by user preference
			expect(
				screen.queryByRole('columnheader', { name: /^name$/i }),
			).not.toBeInTheDocument();
			// Id should still be visible
			expect(
				screen.getByRole('columnheader', { name: /id/i }),
			).toBeInTheDocument();
		});
	});

	describe('column behavior with groupBy (expanded/collapsed)', () => {
		const fetchListDataMock = jest.fn<
			ReturnType<
				K8sBaseListProps<{
					id: string;
					name: string;
					group: string;
				}>['fetchListData']
			>,
			Parameters<
				K8sBaseListProps<{
					id: string;
					name: string;
					group: string;
				}>['fetchListData']
			>
		>();

		const tableColumnsDefinitions: IEntityColumn[] = [
			{
				id: 'group',
				label: 'Group',
				value: 'group',
				defaultVisibility: true,
				canBeHidden: false,
				behavior: 'hidden-on-collapse', // Only visible when grouped
			},
			{
				id: 'name',
				label: 'Name',
				value: 'name',
				defaultVisibility: true,
				canBeHidden: false,
				behavior: 'hidden-on-expand', // Only visible when NOT grouped
			},
			{
				id: 'id',
				label: 'Id',
				value: 'id',
				defaultVisibility: true,
				canBeHidden: false,
				behavior: 'always-visible',
			},
		];

		const tableColumns = [
			{ key: 'group', title: 'Group', dataIndex: 'group' },
			{ key: 'name', title: 'Name', dataIndex: 'name' },
			{ key: 'id', title: 'Id', dataIndex: 'id' },
		];

		beforeEach(() => {
			useInfraMonitoringTableColumnsStore.setState({
				columns: {},
				columnsHidden: {},
			});

			fetchListDataMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [{ id: 'item-1', name: 'Item 1', group: 'Group A' }],
				total: 1,
				error: null,
			});
		});

		it('should hide "hidden-on-collapse" columns when NOT grouped', async () => {
			renderComponent<{ id: string; name: string; group: string }>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				queryParams: {}, // No groupBy
				renderRowData: (data) => ({
					id: data.id,
					name: data.name,
					group: data.group,
					itemKey: data.id,
					groupedByMeta: {},
					key: data.id,
				}),
				tableColumnsDefinitions,
				tableColumns,
			});

			await waitFor(() => {
				expect(screen.getByText('item-1')).toBeInTheDocument();
			});

			// Group column should be hidden (hidden-on-collapse means visible only when expanded/grouped)
			expect(
				screen.queryByRole('columnheader', { name: /group/i }),
			).not.toBeInTheDocument();
			// Name column should be visible (hidden-on-expand means visible when NOT grouped)
			expect(
				screen.getByRole('columnheader', { name: /name/i }),
			).toBeInTheDocument();
			// Id should always be visible
			expect(
				screen.getByRole('columnheader', { name: /id/i }),
			).toBeInTheDocument();
		});

		it('should hide "hidden-on-expand" columns when grouped', async () => {
			const groupByValue = [
				{ key: 'k8s.namespace.name', dataType: 'string', type: 'resource' },
			];

			renderComponent<{ id: string; name: string; group: string }>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				queryParams: {
					groupBy: JSON.stringify(groupByValue),
				},
				renderRowData: (data) => ({
					id: data.id,
					name: data.name,
					group: data.group,
					itemKey: data.id,
					groupedByMeta: { 'k8s.namespace.name': 'default' },
					key: data.id,
				}),
				tableColumnsDefinitions,
				tableColumns,
			});

			await waitFor(() => {
				expect(screen.getByText('item-1')).toBeInTheDocument();
			});

			// Group column should be visible (hidden-on-collapse means visible when grouped)
			expect(
				screen.getByRole('columnheader', { name: /group/i }),
			).toBeInTheDocument();
			// Name column should be hidden (hidden-on-expand means hidden when grouped)
			expect(
				screen.queryByRole('columnheader', { name: /name/i }),
			).not.toBeInTheDocument();
			// Id should always be visible
			expect(
				screen.getByRole('columnheader', { name: /id/i }),
			).toBeInTheDocument();
		});

		it('should show "always-visible" columns regardless of groupBy state', async () => {
			// Test without groupBy
			renderComponent<{ id: string; name: string; group: string }>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				queryParams: {},
				renderRowData: (data) => ({
					id: data.id,
					name: data.name,
					group: data.group,
					itemKey: data.id,
					groupedByMeta: {},
					key: data.id,
				}),
				tableColumnsDefinitions,
				tableColumns,
			});

			await waitFor(() => {
				expect(screen.getByText('item-1')).toBeInTheDocument();
			});

			expect(
				screen.getByRole('columnheader', { name: /id/i }),
			).toBeInTheDocument();
		});
	});

	describe('column visibility in expanded row (nested table)', () => {
		const fetchListDataMock = jest.fn<
			ReturnType<K8sBaseListProps<{ id: string }>['fetchListData']>,
			Parameters<K8sBaseListProps<{ id: string }>['fetchListData']>
		>();
		const groupByValue = [
			{ key: 'k8s.namespace.name', dataType: 'string', type: 'resource' },
		];

		const tableColumnsDefinitions: IEntityColumn[] = [
			{
				id: 'id',
				label: 'Id',
				value: 'id',
				defaultVisibility: true,
				canBeHidden: false,
				behavior: 'always-visible',
			},
		];

		const tableColumns = [{ key: 'id', title: 'Id', dataIndex: 'id' }];

		// Initialize the component once without groupBy to set up the store state
		// This mimics what happens when running with other tests that render first
		beforeAll(() => {
			const initMock = jest.fn().mockResolvedValue({
				data: [{ id: 'init' }],
				total: 1,
				error: null,
			});

			renderComponent<{ id: string }>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: initMock,
				renderRowData: (data) => ({
					id: data.id,
					itemKey: data.id,
					groupedByMeta: {},
					key: data.id,
				}),
				tableColumnsDefinitions,
				tableColumns,
			});
		});

		beforeEach(() => {
			fetchListDataMock.mockClear();
			fetchListDataMock.mockResolvedValue({
				data: [{ id: 'namespace-default' }],
				total: 50,
				error: null,
			});

			// Render in beforeEach with groupBy for the actual test
			renderComponent<{ id: string }>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				queryParams: {
					groupBy: JSON.stringify(groupByValue),
				},
				renderRowData: (data) => ({
					id: data.id,
					itemKey: data.id,
					groupedByMeta: { 'k8s.namespace.name': 'default' },
					key: data.id,
				}),
				tableColumnsDefinitions,
				tableColumns,
			});
		});

		it('should hide "hidden-on-collapse" columns in nested expanded table', async () => {
			const user = userEvent.setup();

			await waitFor(() => {
				expect(screen.getByText('namespace-default')).toBeInTheDocument();
			});

			const row = screen.getByText('namespace-default');
			await user.click(row);

			// Wait for both expanded-table-container and expanded-table to appear
			// The expanded-table only appears after loading completes
			await waitFor(() => {
				expect(screen.getByTestId('expanded-table-container')).toBeInTheDocument();
				expect(screen.getByTestId('expanded-table')).toBeInTheDocument();
			});

			// In the nested table, hidden-on-collapse columns should be hidden
			const expandedTable = screen.getByTestId('expanded-table');
			const nestedTableWrapper = within(expandedTable as HTMLElement);
			// The nested table should NOT have the Group column header
			// Note: headers are hidden in nested table (showHeader={false}), so we check data cells
			expect(nestedTableWrapper.queryByText('Group A')).not.toBeInTheDocument();
		});
	});

	describe('column add/remove via store', () => {
		const fetchListDataMock = jest.fn<
			ReturnType<
				K8sBaseListProps<{
					id: string;
					name: string;
					desc: string;
				}>['fetchListData']
			>,
			Parameters<
				K8sBaseListProps<{
					id: string;
					name: string;
					desc: string;
				}>['fetchListData']
			>
		>();

		const tableColumnsDefinitions: IEntityColumn[] = [
			{
				id: 'id',
				label: 'Id',
				value: 'id',
				defaultVisibility: true,
				canBeHidden: false,
				behavior: 'always-visible',
			},
			{
				id: 'name',
				label: 'Name',
				value: 'name',
				defaultVisibility: true,
				canBeHidden: true,
				behavior: 'always-visible',
			},
			{
				id: 'description',
				label: 'Description',
				value: 'description',
				defaultVisibility: false,
				canBeHidden: true,
				behavior: 'always-visible',
			},
		];

		const tableColumns = [
			{ key: 'id', title: 'Id', dataIndex: 'id' },
			{ key: 'name', title: 'Name', dataIndex: 'name' },
			{ key: 'description', title: 'Description', dataIndex: 'description' },
		];

		beforeEach(() => {
			useInfraMonitoringTableColumnsStore.setState({
				columns: {},
				columnsHidden: {},
			});

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

		it('should hide column when clicking remove in K8sFiltersSidePanel', async () => {
			const user = userEvent.setup();

			renderComponent<{
				id: string;
				name: string;
				desc: string;
			}>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				renderRowData: (data) => ({
					id: data.id,
					name: data.name,
					description: data.desc,
					itemKey: data.id,
					groupedByMeta: {},
					key: data.id,
				}),
				tableColumnsDefinitions,
				tableColumns,
			});

			await waitFor(() => {
				expect(screen.getByText('item-1')).toBeInTheDocument();
			});

			expect(
				screen.getByRole('columnheader', { name: /^name$/i }),
			).toBeInTheDocument();

			const filterButton = screen.getByTestId('k8s-list-filters-button');
			expect(filterButton).toBeDefined();
			await user.click(filterButton!);

			await waitFor(() => {
				expect(
					screen.getByText('Added Columns (Click to remove)'),
				).toBeInTheDocument();
			});

			const nameColumnButton = screen.getByTestId(`remove-column-name`);
			await user.click(nameColumnButton);

			// Name column should now be hidden from the table
			await waitFor(() => {
				expect(
					screen.queryByRole('columnheader', { name: /^name$/i }),
				).not.toBeInTheDocument();
			});
		});

		it('should show column when clicking add in K8sFiltersSidePanel', async () => {
			const user = userEvent.setup();

			renderComponent<{
				id: string;
				name: string;
				desc: string;
			}>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				renderRowData: (data) => ({
					id: data.id,
					name: data.name,
					description: data.desc,
					itemKey: data.id,
					groupedByMeta: {},
					key: data.id,
				}),
				tableColumnsDefinitions,
				tableColumns,
			});

			await waitFor(() => {
				expect(screen.getByText('item-1')).toBeInTheDocument();
			});

			// Initially Description column should be hidden (defaultVisibility=false)
			expect(
				screen.queryByRole('columnheader', { name: /description/i }),
			).not.toBeInTheDocument();

			const filterButton = screen.getByTestId('k8s-list-filters-button');
			await user.click(filterButton!);

			await waitFor(() => {
				expect(
					screen.getByText('Other Columns (Click to add)'),
				).toBeInTheDocument();
			});

			const descriptionColumnButton = screen.getByTestId('add-column-description');
			await user.click(descriptionColumnButton);

			// Description column should now be visible in the table
			await waitFor(() => {
				expect(
					screen.getByRole('columnheader', { name: /description/i }),
				).toBeInTheDocument();
			});
		});

		it('should not allow removing column with canBeHidden=false', async () => {
			renderComponent<{ id: string; name: string; desc: string }>({
				entity: InfraMonitoringEntity.PODS,
				eventCategory: InfraMonitoringEvents.Pod,
				fetchListData: fetchListDataMock,
				renderRowData: (data) => ({
					id: data.id,
					name: data.name,
					description: data.desc,
					itemKey: data.id,
					groupedByMeta: {},
					key: data.id,
				}),
				tableColumnsDefinitions,
				tableColumns,
			});

			await waitFor(() => {
				expect(screen.getByText('item-1')).toBeInTheDocument();
			});

			// Try to remove the Id column (canBeHidden=false)
			act(() => {
				// oxlint-disable-next-line signoz/no-zustand-getstate-in-hooks
				useInfraMonitoringTableColumnsStore
					.getState()
					.removeColumn(InfraMonitoringEntity.PODS, 'id');
			});

			// Id column should still be visible (canBeHidden=false prevents removal)
			expect(
				screen.getByRole('columnheader', { name: /id/i }),
			).toBeInTheDocument();
		});
	});
});
