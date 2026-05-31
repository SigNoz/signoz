import { act, renderHook } from '@testing-library/react';

import * as store from 'lib/recentQueries/store';
import type { RecentQueryInput } from 'lib/recentQueries/store';

import { useRecentQueries } from './useRecentQueries';

const baseInput = (
	overrides: Partial<RecentQueryInput> = {},
): RecentQueryInput => ({
	signal: 'logs',
	filter: { expression: 'a = 1' },
	...overrides,
});

describe('useRecentQueries', () => {
	beforeEach(() => {
		store.__resetForTests();
	});

	it('returns the entries for the given signal', () => {
		act(() => {
			store.save(baseInput({ filter: { expression: 'a = 1' } }));
			store.save(baseInput({ filter: { expression: 'b = 2' } }));
		});

		const { result } = renderHook(() => useRecentQueries('logs'));

		expect(result.current.entries).toHaveLength(2);
		expect(result.current.entries.map((e) => e.filter.expression)).toStrictEqual([
			'b = 2',
			'a = 1',
		]);
	});

	it('does not return entries from other signals', () => {
		act(() => {
			store.save(baseInput({ signal: 'logs' }));
			store.save(baseInput({ signal: 'traces' }));
		});

		const { result } = renderHook(() => useRecentQueries('logs'));

		expect(result.current.entries).toHaveLength(1);
		expect(result.current.entries[0].signal).toBe('logs');
	});

	it('re-renders when a new entry is saved', () => {
		const { result } = renderHook(() => useRecentQueries('logs'));

		expect(result.current.entries).toHaveLength(0);

		act(() => {
			store.save(baseInput());
		});

		expect(result.current.entries).toHaveLength(1);
	});

	it('re-renders when an entry is removed via the returned remove fn', () => {
		const { result } = renderHook(() => useRecentQueries('logs'));

		act(() => {
			store.save(baseInput());
		});
		expect(result.current.entries).toHaveLength(1);

		const id = result.current.entries[0].id;
		act(() => {
			result.current.remove(id);
		});

		expect(result.current.entries).toHaveLength(0);
	});

	it('keeps a stable entries reference when nothing changed', () => {
		act(() => {
			store.save(baseInput());
		});

		const { result, rerender } = renderHook(() => useRecentQueries('logs'));
		const first = result.current.entries;
		rerender();
		const second = result.current.entries;

		expect(second).toBe(first);
	});
});
