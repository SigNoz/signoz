import { initialQueriesMap } from 'constants/queryBuilder';
import { COMPOSITE_QUERY_KEY } from 'lib/compositeQuery/types';
import {
	clearSerializedParams,
	deserialize,
	serialize,
} from 'lib/compositeQuery/serializer';

describe('composite query serializer', () => {
	it('round-trips through serialize/deserialize', () => {
		const query = initialQueriesMap.logs;
		const decoded = deserialize(serialize(query));
		expect(decoded?.builder.queryData[0].dataSource).toBe('logs');
	});

	it('returns null on corrupt input instead of throwing', () => {
		const params = new URLSearchParams();
		params.set(COMPOSITE_QUERY_KEY, '%7Bnot-json');
		expect(deserialize(params)).toBeNull();
	});

	it('returns null for empty/missing value', () => {
		const params = new URLSearchParams();
		expect(deserialize(params)).toBeNull();
	});

	it('preserves id field through roundtrip', () => {
		const query = { ...initialQueriesMap.metrics, id: 'test-query-uuid-123' };
		const serialized = serialize(query);
		const decoded = deserialize(serialized);
		expect(decoded?.id).toBe('test-query-uuid-123');
	});

	it('clearSerializedParams purges every serialized key, leaving others intact', () => {
		const params = serialize(initialQueriesMap.logs);
		params.set('panelTypes', 'list');
		clearSerializedParams(params);
		expect(params.has(COMPOSITE_QUERY_KEY)).toBe(false);
		expect(deserialize(params)).toBeNull();
		expect(params.get('panelTypes')).toBe('list');
	});

	it('clearSerializedParams drops a corrupt legacy key via fallback', () => {
		const params = new URLSearchParams();
		params.set(COMPOSITE_QUERY_KEY, '%7Bnot-json');
		params.set('panelTypes', 'list');
		clearSerializedParams(params);
		expect(params.has(COMPOSITE_QUERY_KEY)).toBe(false);
		expect(params.get('panelTypes')).toBe('list');
	});
});
