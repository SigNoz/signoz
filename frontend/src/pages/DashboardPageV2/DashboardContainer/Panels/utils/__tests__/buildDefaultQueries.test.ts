import { buildDefaultQueries } from '../buildDefaultQueries';

describe('buildDefaultQueries', () => {
	it('seeds a List panel with a runnable logs query ordered by timestamp desc', () => {
		const queries = buildDefaultQueries('signoz/ListPanel');

		expect(queries).toHaveLength(1);
		// orderBy timestamp desc must survive serialization so the preview opens
		// pre-sorted (V1 parity).
		const serialized = JSON.stringify(queries);
		expect(serialized).toContain('timestamp');
		expect(serialized).toContain('desc');
		expect(serialized.toLowerCase()).toContain('logs');
	});

	it('seeds a List panel without a limit so it pages server-side by default', () => {
		const queries = buildDefaultQueries('signoz/ListPanel');

		// A limit would make usePanelQuery treat the panel as a static, unpaged list.
		const spec = queries[0].spec.plugin.spec as { limit?: number };
		expect(spec.limit).toBeUndefined();
	});

	it('seeds no query for non-List kinds (they seed from the builder)', () => {
		expect(buildDefaultQueries('signoz/TimeSeriesPanel')).toStrictEqual([]);
		expect(buildDefaultQueries('signoz/NumberPanel')).toStrictEqual([]);
	});
});
