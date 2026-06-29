import { readColumnWidths, writeColumnWidths } from '../columnWidthStorage';

describe('columnWidthStorage', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('returns an empty map when nothing is stored', () => {
		expect(readColumnWidths('panel-1')).toStrictEqual({});
	});

	it('round-trips widths for a panel', () => {
		writeColumnWidths('panel-1', { name: 200, status: 80 });
		expect(readColumnWidths('panel-1')).toStrictEqual({ name: 200, status: 80 });
	});

	it('keeps each panel isolated', () => {
		writeColumnWidths('panel-1', { a: 100 });
		writeColumnWidths('panel-2', { b: 300 });

		expect(readColumnWidths('panel-1')).toStrictEqual({ a: 100 });
		expect(readColumnWidths('panel-2')).toStrictEqual({ b: 300 });
	});

	it('overwrites a panel without touching the others', () => {
		writeColumnWidths('panel-1', { a: 100 });
		writeColumnWidths('panel-2', { b: 300 });
		writeColumnWidths('panel-1', { a: 150, c: 50 });

		expect(readColumnWidths('panel-1')).toStrictEqual({ a: 150, c: 50 });
		expect(readColumnWidths('panel-2')).toStrictEqual({ b: 300 });
	});
});
