import { toCsv } from '../toCsv';
import { toJsonl } from '../toJsonl';
import { SerializedTable } from '../types';

const table: SerializedTable = {
	headers: ['timestamp', 'value'],
	rows: [
		['t1', 12],
		['t2', 15],
	],
};

describe('toCsv', () => {
	it('emits a header row then one row per record, in column order', () => {
		expect(toCsv(table).split(/\r?\n/)).toStrictEqual([
			'timestamp,value',
			't1,12',
			't2,15',
		]);
	});

	it('quotes values containing the delimiter', () => {
		const csv = toCsv({ headers: ['name', 'value'], rows: [['a,b', 1]] });
		expect(csv.split(/\r?\n/)).toStrictEqual(['name,value', '"a,b",1']);
	});

	it('emits only the header row when there are no data rows', () => {
		expect(toCsv({ headers: ['timestamp'], rows: [] })).toBe('timestamp\r\n');
	});
});

describe('toJsonl', () => {
	it('emits one JSON object per row keyed by header', () => {
		expect(toJsonl(table)).toBe(
			'{"timestamp":"t1","value":12}\n{"timestamp":"t2","value":15}',
		);
	});

	it('emits an empty string when there are no rows', () => {
		expect(toJsonl({ headers: ['timestamp'], rows: [] })).toBe('');
	});
});
