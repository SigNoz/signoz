import {
	compareTableColumnValues,
	RowData,
} from '../createTableColumnsFromQuery';

// Builds a minimal RowData row. Values are intentionally loosely typed because
// real query responses can put objects/arrays into cells despite RowData's
// declared `string | number` index signature (that mismatch is the bug under test).
const row = (value: unknown, dataIndex = 'col'): RowData =>
	({
		timestamp: 0,
		key: 'k',
		[dataIndex]: value,
	}) as unknown as RowData;

describe('compareTableColumnValues', () => {
	it('sorts numerically when both cells are numbers', () => {
		expect(compareTableColumnValues(row(1), row(2), 'col')).toBeLessThan(0);
		expect(compareTableColumnValues(row(2), row(1), 'col')).toBeGreaterThan(0);
		expect(compareTableColumnValues(row(5), row(5), 'col')).toBe(0);
	});

	it('sorts numeric-looking strings numerically, not lexically', () => {
		// "10" vs "9": numeric branch => 10 - 9 > 0. A string compare would be < 0.
		expect(compareTableColumnValues(row('10'), row('9'), 'col')).toBeGreaterThan(
			0,
		);
	});

	it('prefers the `<dataIndex>_without_unit` value for numeric comparison', () => {
		const a = row('2 ms');
		const b = row('10 ms');
		a.col_without_unit = 2;
		b.col_without_unit = 10;
		expect(compareTableColumnValues(a, b, 'col')).toBeLessThan(0);
	});

	it('falls back to locale string compare for non-numeric strings', () => {
		expect(compareTableColumnValues(row('abc'), row('abd'), 'col')).toBe(
			'abc'.localeCompare('abd'),
		);
	});

	it('treats null/undefined cells as empty string (no "null"/"undefined")', () => {
		// Empty string sorts before a real word, and two empties are equal.
		expect(compareTableColumnValues(row(null), row('a'), 'col')).toBeLessThan(0);
		expect(compareTableColumnValues(row(undefined), row(undefined), 'col')).toBe(
			0,
		);
		// If null coerced to the literal "null", this would sort after "a".
		expect(
			compareTableColumnValues(row(null), row('a'), 'col'),
		).not.toBeGreaterThan(0);
	});

	it('does not throw when a cell value is an object', () => {
		const a = row({ foo: 'bar' });
		const b = row({ foo: 'baz' });
		expect(() => compareTableColumnValues(a, b, 'col')).not.toThrow();
		expect(typeof compareTableColumnValues(a, b, 'col')).toBe('number');
	});

	it('does not throw when a cell value is an array', () => {
		const a = row([1, 2]);
		const b = row([3, 4]);
		expect(() => compareTableColumnValues(a, b, 'col')).not.toThrow();
		// String([1,2]) === "1,2" < String([3,4]) === "3,4"
		expect(compareTableColumnValues(a, b, 'col')).toBeLessThan(0);
	});

	it('does not throw when one cell is numeric and the other is an object', () => {
		const a = row(42);
		const b = row({ foo: 'bar' });
		expect(() => compareTableColumnValues(a, b, 'col')).not.toThrow();
		expect(typeof compareTableColumnValues(a, b, 'col')).toBe('number');
	});

	it('does not throw for a number cell compared against an "N/A" cell', () => {
		// http.status_code column: [null, "200", ...] -> ["N/A", 200, ...]
		const numberCell = row(200); // numeric string "200" becomes the number 200
		const naCell = row('N/A'); // null becomes the string "N/A"

		// Both orderings — antd's sorter compares pairs in both directions.
		expect(() =>
			compareTableColumnValues(numberCell, naCell, 'col'),
		).not.toThrow();
		expect(() =>
			compareTableColumnValues(naCell, numberCell, 'col'),
		).not.toThrow();
		expect(typeof compareTableColumnValues(numberCell, naCell, 'col')).toBe(
			'number',
		);
	});
});
