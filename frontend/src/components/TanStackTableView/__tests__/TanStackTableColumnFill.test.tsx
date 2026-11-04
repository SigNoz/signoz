import { screen } from '@testing-library/react';

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

const colWidths = (container: HTMLElement): string[] =>
	Array.from(container.querySelectorAll('colgroup col')).map(
		(col) => (col as HTMLElement).style.width,
	);

const isResizable = (headerText: string): boolean =>
	Boolean(
		screen
			.getByText(headerText)
			.closest('th')
			?.querySelector('[title="Drag to resize column"]'),
	);

describe('TanStackTable column fill', () => {
	it('fills and locks the last column by default', () => {
		const { container } = renderTanStackTable();

		expect(colWidths(container).at(-1)).toBe('100%');
		expect(isResizable('Name')).toBe(true);
		expect(isResizable('Value')).toBe(false);
	});

	it('hands the fill to the previous column when the last passes it on', () => {
		const { container } = renderTanStackTable({
			props: { columns: [...defaultColumns, actionsColumn] },
		});

		const widths = colWidths(container);
		expect(widths.at(-2)).toBe('100%');
		expect(widths.at(-1)).toBe('96px');
		expect(isResizable('Name')).toBe(true);
		expect(isResizable('Value')).toBe(false);
		expect(isResizable('Actions')).toBe(false);
	});
});
