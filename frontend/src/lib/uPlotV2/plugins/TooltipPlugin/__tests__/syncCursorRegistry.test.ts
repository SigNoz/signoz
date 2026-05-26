import { syncCursorRegistry } from '../syncCursorRegistry';

describe('syncCursorRegistry', () => {
	describe('metadata', () => {
		it('returns undefined for unknown key', () => {
			expect(syncCursorRegistry.getMetadata('unknown-meta')).toBeUndefined();
		});

		it('stores and retrieves metadata by syncKey', () => {
			const metadata = { yAxisUnit: 'ms', groupBy: [] };
			syncCursorRegistry.setMetadata('meta-key', metadata);
			expect(syncCursorRegistry.getMetadata('meta-key')).toBe(metadata);
		});
	});

	describe('activeSeriesMetric', () => {
		it('returns null (not undefined) for unknown key', () => {
			expect(
				syncCursorRegistry.getActiveSeriesMetric('unknown-metric'),
			).toBeNull();
		});

		it('stores and retrieves metric by syncKey', () => {
			const metric = { host: 'server1', __name__: 'cpu' };
			syncCursorRegistry.setActiveSeriesMetric('metric-key', metric);
			expect(syncCursorRegistry.getActiveSeriesMetric('metric-key')).toBe(metric);
		});
	});
});
