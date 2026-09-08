import type { Meta, StoryObj } from '@storybook/react-vite';
import { Color } from '@signozhq/design-tokens';
import { Ellipsis } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DropdownMenuSimple } from '@signozhq/ui/dropdown-menu';
import { GroupedStatusCounts } from 'container/InfraMonitoringK8sV2/components/GroupedStatusCounts';
import type { StatusCountItem } from 'container/InfraMonitoringK8sV2/components/GroupedStatusCounts';
import { ValidateColumnValueWrapper } from 'container/InfraMonitoringK8sV2/components/ValidateColumnValueWrapper';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';
import { expect, screen, userEvent, within } from 'storybook/test';

import { withCanvas } from '@/storybook/decorators/withCanvas';
import type { GlobalMockArgs } from '@/storybook/globals';

import TanStackTable from './index';
import type { TableColumnDef, TanStackTableProps } from './types';

type ServiceRow = {
	id: string;
	service: string;
	endpoint: string;
	latency: string;
	owner: string;
};

const rows: ServiceRow[] = [
	{
		id: 'checkout',
		service: 'checkout-service',
		endpoint: 'POST /api/v1/checkout',
		latency: '184 ms',
		owner: 'Payments platform',
	},
	{
		id: 'catalog',
		service: 'catalog-service',
		endpoint: 'GET /api/v2/products/{productId}/availability',
		latency: '96 ms',
		owner: 'Storefront experience',
	},
	{
		id: 'identity',
		service: 'identity-service',
		endpoint: 'POST /api/v1/session/refresh',
		latency: '242 ms',
		owner: 'Identity and access management',
	},
];

const columns: TableColumnDef<ServiceRow>[] = [
	{
		id: 'service',
		header: 'Service',
		accessorKey: 'service',
		pin: 'left',
		width: { fixed: 180 },
		enableSort: true,
		cell: ({ value }): JSX.Element => (
			<TanStackTable.Text>{String(value)}</TanStackTable.Text>
		),
	},
	{
		id: 'endpoint',
		header: 'Endpoint',
		accessorKey: 'endpoint',
		width: { fixed: 320 },
		cell: ({ value }): JSX.Element => (
			<TanStackTable.Text title={String(value)}>
				{String(value)}
			</TanStackTable.Text>
		),
	},
	{
		id: 'latency',
		header: 'P95 latency',
		accessorKey: 'latency',
		width: { fixed: 140 },
		enableSort: true,
		cell: ({ value }): JSX.Element => (
			<TanStackTable.Text>{String(value)}</TanStackTable.Text>
		),
	},
	{
		id: 'owner',
		header: 'Owner',
		accessorKey: 'owner',
		width: { fixed: 240 },
		cell: ({ value }): JSX.Element => (
			<TanStackTable.Text>{String(value)}</TanStackTable.Text>
		),
	},
];

const rowActions = (): JSX.Element => (
	<DropdownMenuSimple
		align="end"
		menu={{
			items: [
				{ key: 'open', label: 'Open service details' },
				{ key: 'copy', label: 'Copy service link' },
			],
		}}
	>
		<Button
			aria-label="Service actions"
			color="secondary"
			size="icon"
			variant="outlined"
		>
			<Ellipsis size={16} />
		</Button>
	</DropdownMenuSimple>
);

const meta = {
	title: 'Components/TanStack Table View',
	component: TanStackTable,
	tags: ['play'],
	decorators: [withCanvas({ height: 360, maxWidth: 640 })],
	args: {
		columns,
		data: rows,
		disableVirtualScroll: true,
		getRowKey: (row): string => row.id,
	},
} satisfies Meta<TanStackTableProps<ServiceRow>>;

export default meta;

type Story = StoryObj<typeof meta>;

type TooltipsStory = StoryObj<GlobalMockArgs>;

/** Data and overflow: pinned columns, clipped long cells, and a horizontal scroll surface. */
export const HorizontalOverflow: Story = {
	args: { testId: 'tanstack-table' },
};

/** Data: a page-sized result with the shared pagination controls and total count. */
export const Pagination: Story = {
	args: {
		pagination: { total: 42, defaultLimit: 10, showTotalCount: true },
	},
};

/** Data: the supported empty result keeps the table structure without a fabricated empty state. */
export const Empty: Story = {
	args: { data: [], testId: 'tanstack-empty-table' },
};

/** Data: the table's real skeleton rows shown while the first page is loading. */
export const Loading: Story = {
	args: { data: [], isLoading: true, skeletonRowCount: 5 },
};

/** Interaction: opens a row action menu rendered through the shared portal. */
export const RowActionsMenu: Story = {
	args: { renderRowActions: rowActions, testId: 'tanstack-actions-table' },
	play: async ({ canvasElement }): Promise<void> => {
		const firstRow = within(canvasElement).getByTestId('tanstack-actions-table');

		await userEvent.hover(firstRow.querySelector('tbody tr') as HTMLElement);
		await userEvent.click(
			await within(firstRow).findByLabelText('Service actions'),
		);
		await expect(
			await screen.findByRole('menuitem', { name: 'Open service details' }),
		).toBeVisible();
	},
};

const RESTART_COUNTS: StatusCountItem[] = [
	{
		label: 'Restarts in the last 24 hours',
		value: 37,
		color: Color.BG_CHERRY_500,
		breakdown: [
			{ label: 'CrashLoopBackOff', value: 14 },
			{ label: 'OOMKilled', value: 11 },
			{ label: 'Liveness probe failed', value: 6 },
			{ label: 'Readiness probe failed', value: 4 },
			{ label: 'Image pull backoff', value: 2 },
		],
	},
];

const tooltipColumns: TableColumnDef<ServiceRow>[] = [
	columns[0],
	{
		id: 'cpuRequest',
		header: 'CPU request',
		width: { fixed: 140 },
		cell: ({ rowId }): JSX.Element => (
			<ValidateColumnValueWrapper
				attribute="CPU request"
				entity={InfraMonitoringEntity.PODS}
				rowId={rowId}
				value={-1}
			>
				<TanStackTable.Text>0.5</TanStackTable.Text>
			</ValidateColumnValueWrapper>
		),
	},
	{
		id: 'restarts',
		header: 'Restarts',
		width: { fixed: 140 },
		cell: ({ rowId }): JSX.Element => (
			<GroupedStatusCounts items={RESTART_COUNTS} rowId={rowId} />
		),
	},
];

/**
 * Both tooltips a hovered row carries, held open: the plain sentence explaining
 * a missing value, and the status breakdown, which is elements rather than text
 * and grows a row per reason. Neither is rendered until the row is hovered, so
 * the play hovers the first one and the control holds what it uncovered.
 */
export const Tooltips: TooltipsStory = {
	args: { tooltipsOpen: true },
	render: (): JSX.Element => (
		<TanStackTable
			columns={tooltipColumns}
			data={rows}
			disableVirtualScroll
			getRowKey={(row): string => row.id}
			testId="tanstack-tooltips-table"
		/>
	),
	play: async ({ canvasElement }): Promise<void> => {
		const table = within(canvasElement).getByTestId('tanstack-tooltips-table');

		await userEvent.hover(table.querySelector('tbody tr') as HTMLElement);
		// Both tooltips are rendered by the hovered row, so this is what says the
		// control has something to hold open.
		await screen.findByText('Restarts in the last 24 hours');
	},
};
