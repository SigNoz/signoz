import { getRowKey } from '../utils';

interface Row {
	key?: string;
	id?: string;
}

describe('getRowKey', () => {
	it('reads rowKey as a function, a field name, or item.key', () => {
		const row: Row = { key: 'k', id: 'i' };

		expect(getRowKey(row, 0, (item) => `fn-${item.id}`)).toBe('fn-i');
		expect(getRowKey(row, 0, 'id')).toBe('i');
		expect(getRowKey(row, 0, undefined)).toBe('k');
	});

	it('falls back to the index when the key is missing or falsy', () => {
		expect(getRowKey<Row>({}, 3, undefined)).toBe('list-item-3');
		expect(getRowKey<Row>({ id: '' }, 4, 'id')).toBe('list-item-4');
		expect(getRowKey('text', 5, undefined)).toBe('list-item-5');
	});
});
