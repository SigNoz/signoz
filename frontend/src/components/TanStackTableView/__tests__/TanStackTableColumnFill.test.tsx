import { screen, within } from '@testing-library/react';

import type { TableColumnDef } from '../types';
import { defaultColumns, renderTanStackTable, type TestRow } from './testUtils';

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: (): boolean => false,
}));

const actionsColumn: TableColumnDef<TestRow> = {
	id: 'actions',
	header: 'Actions',
	cell: (): string => 'act',
	width: { fixed: '96px', passLastColumnFill: true },
};

const colWidths = (): string[] =>
	screen.getAllByTestId('tanstack-col').map((col) => col.style.width);

const isResizable = (columnId: string): boolean =>
	Boolean(
		within(screen.getByTestId(`tanstack-header-${columnId}`)).queryByTitle(
			'Drag to resize column',
		),
	);

describe('TanStackTable column fill', () => {
	it('fills and locks the last column by default', () => {
		renderTanStackTable();

		expect(colWidths().at(-1)).toBe('100%');
		expect(isResizable('name')).toBe(true);
		expect(isResizable('value')).toBe(false);
	});

	it('hands the fill to the previous column when the last passes it on', () => {
		renderTanStackTable({
			props: { columns: [...defaultColumns, actionsColumn] },
		});

		const widths = colWidths();
		expect(widths.at(-2)).toBe('100%');
		expect(widths.at(-1)).toBe('96px');
		expect(isResizable('name')).toBe(true);
		expect(isResizable('value')).toBe(false);
		expect(isResizable('actions')).toBe(false);
	});
});
