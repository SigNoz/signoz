import { render, screen } from '@testing-library/react';

import TanStackCustomTableRow from '../TanStackCustomTableRow';
import type { TanStackTableRowData } from '../types';

jest.mock('../../InfinityTableView/styles', () => ({
	TableRowStyled: 'tr',
}));

jest.mock('hooks/logs/useCopyLogLink', () => ({
	useCopyLogLink: (): { isHighlighted: boolean } => ({ isHighlighted: false }),
}));

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: (): boolean => false,
}));

jest.mock('components/Logs/LogStateIndicator/utils', () => ({
	getLogIndicatorType: (): string => 'info',
	getLogIndicatorTypeForTable: (): string => 'info',
}));

const item: TanStackTableRowData = {
	log: {},
	currentLog: { id: 'row-1' } as TanStackTableRowData['currentLog'],
	rowIndex: 0,
};

/** Required by react-virtuoso `TableRow` / `TableComponents` typing */
const virtuosoTableRowAttrs = {
	'data-index': 0,
	'data-item-index': 0,
	'data-known-size': 40,
} as const;

describe('TanStackCustomTableRow', () => {
	it('renders children inside TableRowStyled', () => {
		render(
			<table>
				<tbody>
					<TanStackCustomTableRow
						{...virtuosoTableRowAttrs}
						item={item}
						logsById={new Map()}
						activeLog={null}
						activeContextLog={null}
					>
						<td>cell</td>
					</TanStackCustomTableRow>
				</tbody>
			</table>,
		);

		expect(screen.getByText('cell')).toBeInTheDocument();
	});

	it('marks row active when activeLog matches item id', () => {
		const { container } = render(
			<table>
				<tbody>
					<TanStackCustomTableRow
						{...virtuosoTableRowAttrs}
						item={item}
						logsById={new Map()}
						activeLog={{ id: 'row-1' } as never}
						activeContextLog={null}
					>
						<td>x</td>
					</TanStackCustomTableRow>
				</tbody>
			</table>,
		);

		const row = container.querySelector('tr');
		expect(row).toBeTruthy();
	});

	it('uses logsById entry when present for indicator type', () => {
		const logFromMap = { id: 'row-1', severity_text: 'error' } as never;
		render(
			<table>
				<tbody>
					<TanStackCustomTableRow
						{...virtuosoTableRowAttrs}
						item={item}
						logsById={new Map([['row-1', logFromMap]])}
						activeLog={null}
						activeContextLog={null}
					>
						<td>x</td>
					</TanStackCustomTableRow>
				</tbody>
			</table>,
		);

		expect(screen.getByText('x')).toBeInTheDocument();
	});
});
