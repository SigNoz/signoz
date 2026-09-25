import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';
import { VirtuosoMockContext } from 'react-virtuoso';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NuqsTestingAdapter, OnUrlUpdateFunction } from 'nuqs/adapters/testing';

import { TableColumnDef } from 'components/TanStackTableView';

import { InfraMonitoringEntity } from '../../../constants';
import EntityOverview from '../EntityOverview';

window.ResizeObserver =
	window.ResizeObserver ||
	jest.fn().mockImplementation(() => ({
		disconnect: jest.fn(),
		observe: jest.fn(),
		unobserve: jest.fn(),
	}));

jest.mock('container/TopNav/DateTimeSelectionV2/index.tsx', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="mock-datetime" />,
}));

jest.mock('components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="mock-query-search" />,
}));

type TestRecord = { name: string; meta?: Record<string, string> | null };

const mockFetchListData = jest.fn();

const mockTableColumns: TableColumnDef<TestRecord>[] = [
	{
		id: 'name',
		header: 'Name',
		accessorKey: 'name',
		cell: ({ value }): string => String(value),
	},
];

jest.mock('../../../Base/entity.registry', () => ({
	getEntityConfig: (category: string) => ({
		list: {
			entity: category,
			tableColumns: mockTableColumns,
			fetchListData: mockFetchListData,
			getRowKey: (record: TestRecord): string => record.name,
			getItemKey: (record: TestRecord): string => record.name,
		},
	}),
}));

const LOCKED_EXPRESSION = "k8s.node.name = 'node-1'";

function renderOverview(onUrlUpdate?: OnUrlUpdateFunction): void {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	render(
		<MemoryRouter>
			<QueryClientProvider client={queryClient}>
				<NuqsTestingAdapter onUrlUpdate={onUrlUpdate}>
					<VirtuosoMockContext.Provider
						value={{ viewportHeight: 800, itemHeight: 50 }}
					>
						<TooltipProvider>
							<EntityOverview
								category={InfraMonitoringEntity.NODES}
								eventEntity="node"
								lockedExpression={LOCKED_EXPRESSION}
							/>
						</TooltipProvider>
					</VirtuosoMockContext.Provider>
				</NuqsTestingAdapter>
			</QueryClientProvider>
		</MemoryRouter>,
	);
}

describe('EntityOverview', () => {
	beforeEach(() => {
		mockFetchListData.mockReset();
		mockFetchListData.mockResolvedValue({
			type: 'list',
			records: [{ name: 'pod-1' }],
			total: 1,
		});
	});

	it('lists the first related resource scoped by the locked expression', async () => {
		renderOverview();

		await waitFor(() => {
			expect(mockFetchListData).toHaveBeenCalled();
		});

		expect(mockFetchListData.mock.calls[0][0].filter.expression).toBe(
			LOCKED_EXPRESSION,
		);
		await expect(
			screen.findByTestId('related-entities-table-pods'),
		).resolves.toBeInTheDocument();
	});

	it('opens the clicked resource in its own drawer', async () => {
		const user = userEvent.setup();
		const onUrlUpdate = jest.fn();

		renderOverview(onUrlUpdate);

		const row = await screen.findByText('pod-1');
		await user.click(row);

		await waitFor(() => {
			const params = onUrlUpdate.mock.calls.map((call) => call[0].searchParams);
			expect(
				params.some(
					(searchParams) =>
						searchParams.get('selectedItem') === 'pod-1' &&
						searchParams.get('selectedItemCategory') === 'pods',
				),
			).toBe(true);
		});
	});

	it('switches the listed resource from the dropdown', async () => {
		const user = userEvent.setup();

		renderOverview();

		await waitFor(() => {
			expect(mockFetchListData).toHaveBeenCalled();
		});

		await user.click(screen.getByTestId('overview-resource-select'));
		await user.click(await screen.findByText('Containers'));

		await expect(
			screen.findByTestId('related-entities-table-containers'),
		).resolves.toBeInTheDocument();
	});
});
