import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ColumnDef } from '@tanstack/react-table';

import { withCanvas } from '@/storybook/decorators/withCanvas';

import type { ITableV3Props } from './TableV3';
import { TableV3 } from './TableV3';

type TraceRow = {
	id: string;
	traceId: string;
	service: string;
	duration: string;
	status: string;
};

const columns: ColumnDef<TraceRow>[] = [
	{ accessorKey: 'traceId', header: 'Trace ID', size: 280 },
	{ accessorKey: 'service', header: 'Service', size: 220 },
	{ accessorKey: 'duration', header: 'Duration', size: 140 },
	{ accessorKey: 'status', header: 'Status', size: 160 },
];

const rows: TraceRow[] = Array.from({ length: 40 }, (_, index) => ({
	id: `trace-${index + 1}`,
	traceId: `c0ffee${String(index + 1).padStart(10, '0')}7f4a9d1c`,
	service: index % 2 === 0 ? 'checkout-service' : 'catalog-service',
	duration: `${80 + index * 6} ms`,
	status: index % 5 === 0 ? 'Error' : 'OK',
}));

const meta = {
	title: 'Components/Table V3',
	component: TableV3,
	decorators: [withCanvas({ height: 360, maxWidth: 640, overflow: 'auto' })],
	args: {
		columns,
		config: { defaultColumnMinSize: 120, defaultColumnMaxSize: 400 },
		data: rows,
		setColumnWidths: (): void => undefined,
	},
} satisfies Meta<ITableV3Props<TraceRow>>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Density and overflow: the virtualized table's wide, resizable column layout. */
export const WideVirtualizedDataset: Story = {};

/** Data: the table's native no-row layout, with headers retained for structural review. */
export const EmptyDataset: Story = {
	args: { data: [] },
};
