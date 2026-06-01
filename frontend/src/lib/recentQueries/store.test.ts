import * as store from './store';
import type { RecentQueryInput } from './store';
import type { RecentQueryEntry } from './types';

const baseInput = (
	overrides: Partial<RecentQueryInput> = {},
): RecentQueryInput => ({
	signal: 'logs',
	filter: { expression: 'service.name = "frontend"' },
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
		store.__resetForTests();
	});

	describe('save + list', () => {
		it('saves an entry and lists it', () => {
			store.save(baseInput());
			const entries = store.list('logs');
			expect(entries).toHaveLength(1);
			expect(entries[0].filter.expression).toBe('service.name = "frontend"');
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
			store.save(baseInput({ filter: { expression: 'a = 1' } }));
			store.save(baseInput({ filter: { expression: 'b = 2' } }));
			store.save(baseInput({ filter: { expression: 'c = 3' } }));

			const entries = store.list('logs');
			expect(entries.map((e) => e.filter.expression)).toStrictEqual([
				'c = 3',
				'b = 2',
				'a = 1',
			]);
		});

		it('re-saving an existing filter bumps it to the front', () => {
			store.save(baseInput({ filter: { expression: 'a = 1' } }));
			store.save(baseInput({ filter: { expression: 'b = 2' } }));
			store.save(baseInput({ filter: { expression: 'a = 1' } }));

			const entries = store.list('logs');
			expect(entries).toHaveLength(2);
			expect(entries.map((e) => e.filter.expression)).toStrictEqual([
				'a = 1',
				'b = 2',
			]);
		});
	});

	describe('dedup', () => {
		it('treats formatting variations of the same filter as one entry', () => {
			store.save(baseInput({ filter: { expression: 'a = 1 AND b = 2' } }));
			store.save(baseInput({ filter: { expression: 'a=1   and  b=2' } }));

			expect(store.list('logs')).toHaveLength(1);
		});
	});

	describe('signal partitioning', () => {
		it('saves to the right bucket per signal', () => {
			store.save(baseInput({ signal: 'logs', filter: { expression: 'a = 1' } }));
			store.save(baseInput({ signal: 'traces', filter: { expression: 'b = 2' } }));
			store.save(
				baseInput({ signal: 'metrics', filter: { expression: 'c = 3' } }),
			);

			expect(store.list('logs')).toHaveLength(1);
			expect(store.list('traces')).toHaveLength(1);
			expect(store.list('metrics')).toHaveLength(1);
			expect(store.list('logs')[0].filter.expression).toBe('a = 1');
			expect(store.list('traces')[0].filter.expression).toBe('b = 2');
			expect(store.list('metrics')[0].filter.expression).toBe('c = 3');
		});

		it('does not leak between signals on dedup', () => {
			store.save(baseInput({ signal: 'logs', filter: { expression: 'a = 1' } }));
			store.save(baseInput({ signal: 'traces', filter: { expression: 'a = 1' } }));

			expect(store.list('logs')).toHaveLength(1);
			expect(store.list('traces')).toHaveLength(1);
		});
	});

	describe('LRU cap', () => {
		it('caps the bucket at 10 entries and evicts the oldest', () => {
			for (let i = 0; i < 11; i += 1) {
				store.save(baseInput({ filter: { expression: `attr_${i} = 1` } }));
			}

			const entries = store.list('logs');
			expect(entries).toHaveLength(10);
			expect(entries[0].filter.expression).toBe('attr_10 = 1');
			expect(entries.some((e) => e.filter.expression === 'attr_0 = 1')).toBe(
				false,
			);
		});
	});

	describe('remove', () => {
		it('removes an entry by id', () => {
			store.save(baseInput({ filter: { expression: 'a = 1' } }));
			const saved = saveOrThrow(baseInput({ filter: { expression: 'b = 2' } }));
			store.remove(saved.id, 'logs');

			const entries = store.list('logs');
			expect(entries).toHaveLength(1);
			expect(entries[0].filter.expression).toBe('a = 1');
		});

		it('is a no-op when the id does not exist', () => {
			store.save(baseInput({ filter: { expression: 'a = 1' } }));
			store.remove('does-not-exist', 'logs');
			expect(store.list('logs')).toHaveLength(1);
		});

		it('does not touch other signals', () => {
			const logsEntry = saveOrThrow(
				baseInput({ signal: 'logs', filter: { expression: 'a = 1' } }),
			);
			store.save(baseInput({ signal: 'traces', filter: { expression: 'a = 1' } }));

			store.remove(logsEntry.id, 'logs');

			expect(store.list('logs')).toHaveLength(0);
			expect(store.list('traces')).toHaveLength(1);
		});
	});

	describe('persistence', () => {
		it('reads back the same entries after the in-memory cache is dropped', () => {
			store.save(baseInput({ filter: { expression: 'a = 1' } }));
			store.save(baseInput({ filter: { expression: 'b = 2' } }));

			store.__dropCacheForTests();

			const entries = store.list('logs');
			expect(entries.map((e) => e.filter.expression)).toStrictEqual([
				'b = 2',
				'a = 1',
			]);
		});
	});

	describe('subscribe', () => {
		it('notifies subscribers on save', () => {
			const cb = jest.fn();
			store.subscribe(cb);
			store.save(baseInput({ filter: { expression: 'a = 1' } }));
			expect(cb).toHaveBeenCalledTimes(1);
		});

		it('notifies subscribers on remove', () => {
			const saved = saveOrThrow(baseInput({ filter: { expression: 'a = 1' } }));
			const cb = jest.fn();
			store.subscribe(cb);
			store.remove(saved.id, 'logs');
			expect(cb).toHaveBeenCalledTimes(1);
		});

		it('stops notifying after unsubscribe', () => {
			const cb = jest.fn();
			const unsubscribe = store.subscribe(cb);
			unsubscribe();
			store.save(baseInput({ filter: { expression: 'a = 1' } }));
			expect(cb).not.toHaveBeenCalled();
		});

		it('does not notify for no-op removes', () => {
			const cb = jest.fn();
			store.subscribe(cb);
			store.remove('does-not-exist', 'logs');
			expect(cb).not.toHaveBeenCalled();
		});
	});
});
