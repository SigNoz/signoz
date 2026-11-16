import type { TableColumnDef } from '../types';
import { getFillColumnIndex } from '../utils';

const column = (
	id: string,
	width?: TableColumnDef<unknown>['width'],
): TableColumnDef<unknown> => ({
	id,
	header: id,
	cell: (): null => null,
	width,
});

describe('getFillColumnIndex', () => {
	it('fills the last column by default', () => {
		expect(getFillColumnIndex([column('a'), column('b')])).toBe(1);
	});

	it('fills the previous column when the last passes it on', () => {
		expect(
			getFillColumnIndex([
				column('a'),
				column('b'),
				column('actions', { fixed: '96px', passLastColumnFill: true }),
			]),
		).toBe(1);
	});
});
