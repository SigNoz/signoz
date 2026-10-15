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

const mockQuerySearchProps = jest.fn();

jest.mock('components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch', () => ({
	__esModule: true,
	default: (props: {
		queryData?: { filter?: { expression?: string } };
		initialExpression?: string;
	}): JSX.Element => {
		mockQuerySearchProps(props);
		return <div data-testid="mock-query-search" />;
	},
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

const NODE_ATTRIBUTES = {
	'k8s.node.name': 'node-1',
	'k8s.cluster.name': 'prod',
};

const LOCKED_EXPRESSION =
	"k8s.cluster.name = 'prod' AND k8s.node.name = 'node-1'";

interface RenderOptions {
	onUrlUpdate?: OnUrlUpdateFunction;
	attributes?: Record<string, string>;
}

function overviewTree(
	attributes: Record<string, string>,
	queryClient: QueryClient,
	onUrlUpdate?: OnUrlUpdateFunction,
): JSX.Element {
	return (
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
								attributes={attributes}
								entity={{ nodeName: attributes['k8s.node.name'] }}
								entityName={attributes['k8s.node.name']}
								queryKeyPrefix="node"
							/>
						</TooltipProvider>
					</VirtuosoMockContext.Provider>
				</NuqsTestingAdapter>
			</QueryClientProvider>
		</MemoryRouter>
	);
}

function renderOverview({
	onUrlUpdate,
	attributes = NODE_ATTRIBUTES,
}: RenderOptions = {}): {
	openAnotherResource: (next: Record<string, string>) => void;
} {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	const { rerender } = render(
		overviewTree(attributes, queryClient, onUrlUpdate),
	);

	return {
		openAnotherResource: (next): void =>
			rerender(overviewTree(next, queryClient, onUrlUpdate)),
	};
}

describe('EntityOverview', () => {
	beforeEach(() => {
		mockQuerySearchProps.mockReset();
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

	it('keeps the locked scope out of the editable filter', async () => {
		renderOverview();

		// The chip leads with the relation and counts the scope behind it
		const chip = await screen.findByTestId('overview-locked-scope');
		expect(chip).toHaveTextContent("k8s.node.name = 'node-1'");
		expect(chip).toHaveTextContent('+1');

		// The editor is handed the user's own expression, never the locked scope
		const lastProps = mockQuerySearchProps.mock.calls.at(-1)?.[0];
		expect(lastProps.queryData.filter.expression).toBe('');
		expect(lastProps.initialExpression).toBe(LOCKED_EXPRESSION);
	});

	it('opens the clicked resource in its own drawer', async () => {
		const user = userEvent.setup();
		const onUrlUpdate = jest.fn();

		renderOverview({ onUrlUpdate });

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

	it("forgets the previous drawer's resource when another one opens", async () => {
		const user = userEvent.setup();

		const { openAnotherResource } = renderOverview();

		await user.click(screen.getByTestId('overview-resource-select'));
		await user.click(
			await screen.findByTestId('overview-resource-option-containers'),
		);
		await expect(
			screen.findByTestId('related-entities-table-containers'),
		).resolves.toBeInTheDocument();

		openAnotherResource({ ...NODE_ATTRIBUTES, 'k8s.node.name': 'node-2' });

		// Back to pods, this node's default, rather than the containers just picked
		await expect(
			screen.findByTestId('related-entities-table-pods'),
		).resolves.toBeInTheDocument();
	});

	it('says so when the resource relates to nothing', async () => {
		renderOverview({ attributes: { 'os.type': 'linux' } });

		await expect(
			screen.findByText(/Nothing related to this Node/),
		).resolves.toBeInTheDocument();
		expect(mockFetchListData).not.toHaveBeenCalled();
	});

	it('switches the listed resource from the dropdown', async () => {
		const user = userEvent.setup();

		renderOverview();

		await waitFor(() => {
			expect(mockFetchListData).toHaveBeenCalled();
		});

		await user.click(screen.getByTestId('overview-resource-select'));

		// Every resource related to a node is offered, the listed one included
		await expect(
			screen.findByTestId('overview-resource-option-pods'),
		).resolves.toBeInTheDocument();

		await user.click(
			await screen.findByTestId('overview-resource-option-containers'),
		);

		await expect(
			screen.findByTestId('related-entities-table-containers'),
		).resolves.toBeInTheDocument();
	});
});
