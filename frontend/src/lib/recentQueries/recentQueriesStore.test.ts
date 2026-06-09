import { MAX_ENTRIES } from './constants';
import * as store from './recentQueriesStore';
import type { RecentQueryInput } from './recentQueriesStore';
import type { RecentQueryEntry } from './types';

const baseInput = (
	overrides: Partial<RecentQueryInput> = {},
): RecentQueryInput => ({
	signal: 'logs',
	filter: { expression: "service.name = 'frontend'" },
	...overrides,
});

function saveOrThrow(input: RecentQueryInput): RecentQueryEntry {
	const saved = store.save(input);
	if (!saved) {
		throw new Error('expected save to return an entry');
	}
	return saved;
}

describe('recentQueries store', () => {
	beforeEach(() => {
		store.useRecentQueriesStore.setState({ buckets: {} });
		localStorage.clear();
	});

	describe('save + list', () => {
		it('saves an entry and lists it', () => {
			store.save(baseInput());
			const entries = store.list('logs');
			expect(entries).toHaveLength(1);
			expect(entries[0].filter.expression).toBe("service.name = 'frontend'");
			expect(entries[0].id).toBeTruthy();
			expect(entries[0].lastUsedAt).toBeGreaterThan(0);
		});

		it('does not save when the filter expression is empty', () => {
			const result = store.save(baseInput({ filter: { expression: '' } }));
			expect(result).toBeNull();
			expect(store.list('logs')).toHaveLength(0);
		});

		it('does not save when the filter expression is whitespace only', () => {
			const result = store.save(baseInput({ filter: { expression: '   ' } }));
			expect(result).toBeNull();
			expect(store.list('logs')).toHaveLength(0);
		});
	});

	describe('LRU ordering', () => {
		it('places the most recently saved entry at the front', () => {
			store.save(baseInput({ filter: { expression: "severity_text = 'ERROR'" } }));
			store.save(baseInput({ filter: { expression: 'http.status_code >= 500' } }));
			store.save(baseInput({ filter: { expression: 'attempt = 1' } }));

			const entries = store.list('logs');
			expect(entries.map((e) => e.filter.expression)).toStrictEqual([
				'attempt = 1',
				'http.status_code >= 500',
				"severity_text = 'ERROR'",
			]);
		});

		it('re-saving an existing filter bumps it to the front', () => {
			store.save(baseInput({ filter: { expression: "severity_text = 'ERROR'" } }));
			store.save(baseInput({ filter: { expression: 'http.status_code >= 500' } }));
			store.save(baseInput({ filter: { expression: "severity_text = 'ERROR'" } }));

			const entries = store.list('logs');
			expect(entries).toHaveLength(2);
			expect(entries.map((e) => e.filter.expression)).toStrictEqual([
				"severity_text = 'ERROR'",
				'http.status_code >= 500',
			]);
		});
	});

	describe('dedup', () => {
		it('treats formatting variations of the same filter as one entry', () => {
			store.save(
				baseInput({
					filter: { expression: "severity_text = 'ERROR' AND attempt = 1" },
				}),
			);
			store.save(
				baseInput({
					filter: { expression: "severity_text='ERROR'   and    attempt=1" },
				}),
			);

			expect(store.list('logs')).toHaveLength(1);
		});
	});

	describe('signal partitioning', () => {
		it('saves to the right bucket per signal', () => {
			store.save(
				baseInput({
					signal: 'logs',
					filter: { expression: "severity_text = 'ERROR'" },
				}),
			);
			store.save(
				baseInput({
					signal: 'traces',
					filter: { expression: "service.name = 'orders-api'" },
				}),
			);
			store.save(
				baseInput({
					signal: 'metrics',
					filter: { expression: 'cpu_usage > 80' },
				}),
			);

			expect(store.list('logs')).toHaveLength(1);
			expect(store.list('traces')).toHaveLength(1);
			expect(store.list('metrics')).toHaveLength(1);
			expect(store.list('logs')[0].filter.expression).toBe(
				"severity_text = 'ERROR'",
			);
			expect(store.list('traces')[0].filter.expression).toBe(
				"service.name = 'orders-api'",
			);
			expect(store.list('metrics')[0].filter.expression).toBe('cpu_usage > 80');
		});

		it('does not leak between signals on dedup', () => {
			store.save(
				baseInput({
					signal: 'logs',
					filter: { expression: "service.name = 'frontend'" },
				}),
			);
			store.save(
				baseInput({
					signal: 'traces',
					filter: { expression: "service.name = 'frontend'" },
				}),
			);

			expect(store.list('logs')).toHaveLength(1);
			expect(store.list('traces')).toHaveLength(1);
		});
	});

	describe('LRU cap', () => {
		it('caps the bucket at MAX_ENTRIES and evicts the oldest', () => {
			const total = MAX_ENTRIES + 1;
			for (let i = 0; i < total; i += 1) {
				store.save(baseInput({ filter: { expression: `attempt = ${i}` } }));
			}

			const entries = store.list('logs');
			expect(entries).toHaveLength(MAX_ENTRIES);
			expect(entries[0].filter.expression).toBe(`attempt = ${total - 1}`);
			expect(entries.some((e) => e.filter.expression === 'attempt = 0')).toBe(
				false,
			);
		});
	});

	describe('remove', () => {
		it('removes an entry by id', () => {
			store.save(baseInput({ filter: { expression: "severity_text = 'ERROR'" } }));
			const saved = saveOrThrow(
				baseInput({ filter: { expression: 'http.status_code >= 500' } }),
			);
			store.remove(saved.id, 'logs');

			const entries = store.list('logs');
			expect(entries).toHaveLength(1);
			expect(entries[0].filter.expression).toBe("severity_text = 'ERROR'");
		});

		it('is a no-op when the id does not exist', () => {
			store.save(baseInput({ filter: { expression: "severity_text = 'ERROR'" } }));
			store.remove('does-not-exist', 'logs');
			expect(store.list('logs')).toHaveLength(1);
		});

		it('does not touch other signals', () => {
			const logsEntry = saveOrThrow(
				baseInput({
					signal: 'logs',
					filter: { expression: "service.name = 'frontend'" },
				}),
			);
			store.save(
				baseInput({
					signal: 'traces',
					filter: { expression: "service.name = 'frontend'" },
				}),
			);

			store.remove(logsEntry.id, 'logs');

			expect(store.list('logs')).toHaveLength(0);
			expect(store.list('traces')).toHaveLength(1);
		});
	});

	describe('persistence', () => {
		it('reads back the same entries after the in-memory state is reset', () => {
			store.save(baseInput({ filter: { expression: "severity_text = 'ERROR'" } }));
			store.save(baseInput({ filter: { expression: 'http.status_code >= 500' } }));

			store.useRecentQueriesStore.setState({ buckets: {} });

			const entries = store.list('logs');
			expect(entries.map((e) => e.filter.expression)).toStrictEqual([
				'http.status_code >= 500',
				"severity_text = 'ERROR'",
			]);
		});
	});

	describe('reactive subscription via zustand', () => {
		it('notifies zustand subscribers on save', () => {
			const cb = jest.fn();
			const unsubscribe = store.useRecentQueriesStore.subscribe(cb);
			store.save(baseInput({ filter: { expression: "severity_text = 'ERROR'" } }));
			expect(cb).toHaveBeenCalledTimes(1);
			unsubscribe();
		});

		it('notifies zustand subscribers on remove', () => {
			const saved = saveOrThrow(
				baseInput({ filter: { expression: "severity_text = 'ERROR'" } }),
			);
			const cb = jest.fn();
			const unsubscribe = store.useRecentQueriesStore.subscribe(cb);
			store.remove(saved.id, 'logs');
			expect(cb).toHaveBeenCalledTimes(1);
			unsubscribe();
		});

		it('stops notifying after unsubscribe', () => {
			const cb = jest.fn();
			const unsubscribe = store.useRecentQueriesStore.subscribe(cb);
			unsubscribe();
			store.save(baseInput({ filter: { expression: "severity_text = 'ERROR'" } }));
			expect(cb).not.toHaveBeenCalled();
		});
	});
});
