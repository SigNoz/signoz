import { act, renderHook } from '@testing-library/react';
import * as store from 'lib/recentQueries/recentQueriesStore';
import type { SignalType } from 'types/api/v5/queryRange';

import { useRecents } from './useRecents';

describe('useRecents', () => {
	beforeEach(() => {
		store.useRecentQueriesStore.setState({ buckets: {} });
		localStorage.clear();
	});

	it('returns the current entries for a (signal, source) bucket', () => {
		store.save({
			signal: 'logs',
			filter: { expression: "severity_text = 'ERROR'" },
		});

		const { result } = renderHook(() => useRecents('logs', ''));

		expect(result.current).toHaveLength(1);
		expect(result.current[0].filter.expression).toBe("severity_text = 'ERROR'");
	});

	it('re-renders when the subscribed bucket is updated', () => {
		const { result } = renderHook(() => useRecents('logs', ''));
		expect(result.current).toHaveLength(0);

		act(() => {
			store.save({
				signal: 'logs',
				filter: { expression: "severity_text = 'ERROR'" },
			});
		});

		expect(result.current).toHaveLength(1);
		expect(result.current[0].filter.expression).toBe("severity_text = 'ERROR'");
	});

	it('returns a stable reference when an unrelated bucket changes', () => {
		const { result } = renderHook(() => useRecents('logs', ''));
		const before = result.current;

		act(() => {
			store.save({
				signal: 'metrics',
				source: 'meter',
				filter: { expression: 'cpu_usage > 80' },
			});
		});

		// The logs bucket snapshot must stay reference-equal so useSyncExternalStore
		// short-circuits the re-render path via Object.is.
		expect(result.current).toBe(before);
		expect(result.current).toHaveLength(0);
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
				useRecents(signal, source),
			{ initialProps: { signal: 'logs' as SignalType, source: '' } },
		);

		expect(result.current).toHaveLength(1);
		expect(result.current[0].filter.expression).toBe("severity_text = 'ERROR'");

		rerender({ signal: 'metrics' as SignalType, source: 'meter' });

		expect(result.current).toHaveLength(1);
		expect(result.current[0].filter.expression).toBe('cpu_usage > 80');
	});

	it('reflects removals', () => {
		const saved = store.save({
			signal: 'logs',
			filter: { expression: "severity_text = 'ERROR'" },
		});
		if (!saved) {
			throw new Error('save did not return an entry');
		}

		const { result } = renderHook(() => useRecents('logs', ''));
		expect(result.current).toHaveLength(1);

		act(() => {
			store.remove(saved.id, 'logs');
		});

		expect(result.current).toHaveLength(0);
	});
});
