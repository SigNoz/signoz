import type { PanelTableColumn } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { formatTableCellText } from '../tableColumns';

jest.mock('../../../utils/formatPanelValue', () => ({
	formatPanelValue: (value: number, unit?: string): string =>
		`${value}${unit ?? ''}`,
}));

const valueColumn: PanelTableColumn = {
	name: 'p99',
	queryName: 'A',
	isValueColumn: true,
	id: 'A',
};

const groupColumn: PanelTableColumn = {
	name: 'service',
	queryName: 'A',
	isValueColumn: false,
	id: 'service',
};

describe('formatTableCellText', () => {
	it.each([null, undefined, ''])(
		'renders empty value-column cells (%p) as n/a instead of 0',
		(raw) => {
			expect(formatTableCellText(valueColumn, raw, 'ms', undefined)).toBe('n/a');
		},
	);

	it('keeps a real zero as a formatted 0, not n/a', () => {
		expect(formatTableCellText(valueColumn, 0, 'ms', undefined)).toBe('0ms');
	});

	it('formats a numeric value column through unit + precision', () => {
		expect(formatTableCellText(valueColumn, 1234, 'ms', undefined)).toBe(
			'1234ms',
		);
	});

	it('renders a non-numeric value cell as raw text', () => {
		expect(formatTableCellText(valueColumn, 'n/a', 'ms', undefined)).toBe('n/a');
	});

	it.each([null, undefined, ''])(
		'renders empty group-column cells (%p) as n/a',
		(raw) => {
			expect(formatTableCellText(groupColumn, raw, undefined, undefined)).toBe(
				'n/a',
			);
		},
	);

	it('renders group-column labels as raw text', () => {
		expect(
			formatTableCellText(groupColumn, 'frontend', undefined, undefined),
		).toBe('frontend');
	});
});
