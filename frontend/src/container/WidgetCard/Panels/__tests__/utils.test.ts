import { QueryDataV3 } from 'types/api/widgets/getQuery';

import { getValueFromTableResult } from '../utils';

const buildResult = (
	table: NonNullable<QueryDataV3['table']>,
): QueryDataV3[] => [
	{
		queryName: 'A',
		legend: '',
		series: null,
		list: null,
		table,
	},
];

describe('getValueFromTableResult', () => {
	it('reads the value column of the first row', () => {
		const result = buildResult({
			columns: [{ name: 'A', queryName: 'A', isValueColumn: true, id: 'A' }],
			rows: [{ data: { A: 461.059 } }],
		});

		expect(getValueFromTableResult(result)).toBe(461.059);
	});

	it('prefers the value column over a group-by column', () => {
		const result = buildResult({
			columns: [
				{ name: 'service.name', queryName: 'A', isValueColumn: false },
				{ name: 'A', queryName: 'A', isValueColumn: true, id: 'A' },
			],
			rows: [{ data: { 'service.name': 'frontend', A: 12.5 } }],
		});

		expect(getValueFromTableResult(result)).toBe(12.5);
	});

	it('falls back to the first cell when no value column is flagged', () => {
		const result = buildResult({
			columns: [{ name: 'A', queryName: 'A', isValueColumn: false }],
			rows: [{ data: { A: 7 } }],
		});

		expect(getValueFromTableResult(result)).toBe(7);
	});

	it('coerces numeric strings', () => {
		const result = buildResult({
			columns: [{ name: 'A', queryName: 'A', isValueColumn: true, id: 'A' }],
			rows: [{ data: { A: '295.4299833508185' } }],
		});

		expect(getValueFromTableResult(result)).toBe(295.4299833508185);
	});

	it('skips queries with no rows and reads the next one', () => {
		const result: QueryDataV3[] = [
			...buildResult({
				columns: [{ name: 'A', queryName: 'A', isValueColumn: true, id: 'A' }],
				rows: [],
			}),
			...buildResult({
				columns: [{ name: 'B', queryName: 'B', isValueColumn: true, id: 'B' }],
				rows: [{ data: { B: 3 } }],
			}),
		];

		expect(getValueFromTableResult(result)).toBe(3);
	});

	it('returns undefined for non-numeric, empty and missing input', () => {
		const nonNumeric = buildResult({
			columns: [{ name: 'A', queryName: 'A', isValueColumn: true, id: 'A' }],
			rows: [{ data: { A: 'n/a' } }],
		});

		expect(getValueFromTableResult(nonNumeric)).toBeUndefined();
		expect(getValueFromTableResult([])).toBeUndefined();
		expect(getValueFromTableResult(undefined)).toBeUndefined();
	});

	it('returns zero rather than undefined for a genuine zero value', () => {
		const result = buildResult({
			columns: [{ name: 'A', queryName: 'A', isValueColumn: true, id: 'A' }],
			rows: [{ data: { A: 0 } }],
		});

		expect(getValueFromTableResult(result)).toBe(0);
	});
});
