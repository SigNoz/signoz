import { ReactNode } from 'react';
import { VirtuosoMockContext } from 'react-virtuoso';
import { TooltipProvider } from '@signozhq/ui';
import { render, RenderResult } from '@testing-library/react';
import { NuqsTestingAdapter, OnUrlUpdateFunction } from 'nuqs/adapters/testing';

import TanStackTable from '../index';
import type { TableColumnDef, TanStackTableProps } from '../types';

// NOTE: Test files importing this utility must add this mock at the top of their file:
// jest.mock('hooks/useDarkMode', () => ({ useIsDarkMode: (): boolean => false }));

// Default test data types
export type TestRow = { id: string; name: string; value: number };

export const defaultColumns: TableColumnDef<TestRow>[] = [
	{
		id: 'id',
		header: 'ID',
		accessorKey: 'id',
		enableSort: true,
		cell: ({ value }): string => String(value),
	},
	{
		id: 'name',
		header: 'Name',
		accessorKey: 'name',
		cell: ({ value }): string => String(value),
	},
	{
		id: 'value',
		header: 'Value',
		accessorKey: 'value',
		enableSort: true,
		cell: ({ value }): string => String(value),
	},
];

export const defaultData: TestRow[] = [
	{ id: '1', name: 'Item 1', value: 100 },
	{ id: '2', name: 'Item 2', value: 200 },
	{ id: '3', name: 'Item 3', value: 300 },
];

export type RenderTanStackTableOptions<T> = {
	props?: Partial<TanStackTableProps<T>>;
	queryParams?: Record<string, string>;
	onUrlUpdate?: OnUrlUpdateFunction;
};

export function renderTanStackTable<T = TestRow>(
	options: RenderTanStackTableOptions<T> = {},
): RenderResult {
	const { props = {}, queryParams, onUrlUpdate } = options;

	const mergedProps = {
		data: defaultData as unknown as T[],
		columns: defaultColumns as unknown as TableColumnDef<T>[],
		...props,
	} as TanStackTableProps<T>;

	return render(
		<NuqsTestingAdapter searchParams={queryParams} onUrlUpdate={onUrlUpdate}>
			<VirtuosoMockContext.Provider
				value={{ viewportHeight: 500, itemHeight: 50 }}
			>
				<TooltipProvider>
					<TanStackTable<T> {...mergedProps} />
				</TooltipProvider>
			</VirtuosoMockContext.Provider>
		</NuqsTestingAdapter>,
	);
}

// Helper to wrap any component with test providers (for unit tests)
export function renderWithProviders(
	ui: ReactNode,
	options: {
		queryParams?: Record<string, string>;
		onUrlUpdate?: OnUrlUpdateFunction;
	} = {},
): RenderResult {
	const { queryParams, onUrlUpdate } = options;

	return render(
		<NuqsTestingAdapter searchParams={queryParams} onUrlUpdate={onUrlUpdate}>
			<VirtuosoMockContext.Provider
				value={{ viewportHeight: 500, itemHeight: 50 }}
			>
				<TooltipProvider>{ui}</TooltipProvider>
			</VirtuosoMockContext.Provider>
		</NuqsTestingAdapter>,
	);
}
