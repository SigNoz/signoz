import * as store from './recentQueriesStore';
import { getRecentQueries } from './getRecentQueries';

describe('getRecentQueries', () => {
	beforeEach(() => {
		store.useRecentQueriesStore.setState({ buckets: {} });
		localStorage.clear();
	});

	it('returns the entries for a (signal, source) bucket', () => {
		store.save({
			signal: 'logs',
			filter: { expression: "severity_text = 'ERROR'" },
		});

		const entries = getRecentQueries('logs', '');
		expect(entries).toHaveLength(1);
		expect(entries[0].filter.expression).toBe("severity_text = 'ERROR'");
	});

	it('returns an empty array for a bucket with no entries', () => {
		expect(getRecentQueries('logs', '')).toHaveLength(0);
	});

	it('reads the latest entries on each call (non-subscribing)', () => {
		expect(getRecentQueries('logs', '')).toHaveLength(0);

		store.save({
			signal: 'logs',
			filter: { expression: "severity_text = 'ERROR'" },
		});

		expect(getRecentQueries('logs', '')).toHaveLength(1);
	});

	it('partitions by signal and source', () => {
		store.save({
			signal: 'logs',
			filter: { expression: "severity_text = 'ERROR'" },
		});
		store.save({
			signal: 'metrics',
			source: 'meter',
			filter: { expression: 'cpu_usage > 80' },
		});

		expect(getRecentQueries('logs', '')).toHaveLength(1);
		expect(getRecentQueries('metrics', 'meter')).toHaveLength(1);
		expect(getRecentQueries('metrics', '')).toHaveLength(0);
	});
});
