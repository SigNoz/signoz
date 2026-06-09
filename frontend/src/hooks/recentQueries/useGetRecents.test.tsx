import { renderHook } from '@testing-library/react';
import * as store from 'lib/recentQueries/recentQueriesStore';
import type { SignalType } from 'types/api/v5/queryRange';

import { useGetRecents } from './useGetRecents';

describe('useGetRecents', () => {
	beforeEach(() => {
		store.useRecentQueriesStore.setState({ buckets: {} });
		localStorage.clear();
	});

	it('returns a getter that reads the current entries for a (signal, source) bucket', () => {
		store.save({
			signal: 'logs',
			filter: { expression: "severity_text = 'ERROR'" },
		});

		const { result } = renderHook(() => useGetRecents('logs', ''));
		const entries = result.current();

		expect(entries).toHaveLength(1);
		expect(entries[0].filter.expression).toBe("severity_text = 'ERROR'");
	});

	it('reflects later writes without re-rendering the consumer', () => {
		const { result } = renderHook(() => useGetRecents('logs', ''));
		const getterBefore = result.current;
		expect(result.current()).toHaveLength(0);

		// Mutate the store outside of `act` — there is no subscription, so React
		// does not (and must not) re-render. The getter must still observe the
		// write when invoked.
		store.save({
			signal: 'logs',
			filter: { expression: "severity_text = 'ERROR'" },
		});

		expect(result.current).toBe(getterBefore);
		const entries = result.current();
		expect(entries).toHaveLength(1);
		expect(entries[0].filter.expression).toBe("severity_text = 'ERROR'");
	});

	it('switches buckets when (signal, source) deps change', () => {
		store.save({
			signal: 'logs',
			filter: { expression: "severity_text = 'ERROR'" },
		});
		store.save({
			signal: 'metrics',
			source: 'meter',
			filter: { expression: 'cpu_usage > 80' },
		});

		const { result, rerender } = renderHook(
			({ signal, source }: { signal: SignalType; source: string }) =>
				useGetRecents(signal, source),
			{ initialProps: { signal: 'logs' as SignalType, source: '' } },
		);

		expect(result.current()).toHaveLength(1);
		expect(result.current()[0].filter.expression).toBe("severity_text = 'ERROR'");

		rerender({ signal: 'metrics' as SignalType, source: 'meter' });

		expect(result.current()).toHaveLength(1);
		expect(result.current()[0].filter.expression).toBe('cpu_usage > 80');
	});

	it('returns a stable getter reference when (signal, source) are unchanged', () => {
		const { result, rerender } = renderHook(() => useGetRecents('logs', ''));
		const before = result.current;

		rerender();

		expect(result.current).toBe(before);
	});

	it('reflects removals on the next getter invocation', () => {
		const saved = store.save({
			signal: 'logs',
			filter: { expression: "severity_text = 'ERROR'" },
		});
		if (!saved) {
			throw new Error('save did not return an entry');
		}

		const { result } = renderHook(() => useGetRecents('logs', ''));
		expect(result.current()).toHaveLength(1);

		store.remove(saved.id, 'logs');

		expect(result.current()).toHaveLength(0);
	});
});
