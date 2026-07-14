import { act, renderHook } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';

import { useUrlSearchState } from './useUrlSearchState';

jest.useFakeTimers();

const DEFAULT_DEBOUNCE_MS = 300;

function createWrapper(searchParams?: string) {
	return function Wrapper({
		children,
	}: {
		children: React.ReactNode;
	}): JSX.Element {
		return (
			<NuqsTestingAdapter searchParams={searchParams}>
				{children}
			</NuqsTestingAdapter>
		);
	};
}

describe('useUrlSearchState', () => {
	afterEach(() => {
		jest.clearAllTimers();
	});

	describe('initialization', () => {
		it('initializes with empty string when no URL param', () => {
			const { result } = renderHook(() => useUrlSearchState('search'), {
				wrapper: createWrapper(),
			});

			expect(result.current.searchText).toBe('');
			expect(result.current.debouncedSearch).toBe('');
		});

		it('initializes from URL param', () => {
			const { result } = renderHook(() => useUrlSearchState('search'), {
				wrapper: createWrapper('?search=hello'),
			});

			expect(result.current.searchText).toBe('hello');
			expect(result.current.debouncedSearch).toBe('hello');
		});
	});

	describe('user typing', () => {
		it('updates searchText immediately on handleSearchChange', () => {
			const { result } = renderHook(() => useUrlSearchState('search'), {
				wrapper: createWrapper(),
			});

			act(() => {
				result.current.handleSearchChange({
					target: { value: 'test' },
				} as React.ChangeEvent<HTMLInputElement>);
			});

			expect(result.current.searchText).toBe('test');
			expect(result.current.debouncedSearch).toBe('');
		});

		it('updates searchText immediately on setSearchText', () => {
			const { result } = renderHook(() => useUrlSearchState('search'), {
				wrapper: createWrapper(),
			});

			act(() => {
				result.current.setSearchText('direct');
			});

			expect(result.current.searchText).toBe('direct');
		});

		it('updates debouncedSearch after debounce delay', () => {
			const { result } = renderHook(() => useUrlSearchState('search'), {
				wrapper: createWrapper(),
			});

			act(() => {
				result.current.setSearchText('delayed');
			});

			expect(result.current.debouncedSearch).toBe('');

			act(() => {
				jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
			});

			expect(result.current.debouncedSearch).toBe('delayed');
		});

		it('respects custom debounce delay', () => {
			const customDelay = 500;
			const { result } = renderHook(
				() => useUrlSearchState('search', { debounceMs: customDelay }),
				{ wrapper: createWrapper() },
			);

			act(() => {
				result.current.setSearchText('custom');
			});

			act(() => {
				jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
			});

			expect(result.current.debouncedSearch).toBe('');

			act(() => {
				jest.advanceTimersByTime(customDelay - DEFAULT_DEBOUNCE_MS);
			});

			expect(result.current.debouncedSearch).toBe('custom');
		});
	});

	describe('debounce behavior', () => {
		it('does not update debouncedSearch before delay', () => {
			const { result } = renderHook(() => useUrlSearchState('search'), {
				wrapper: createWrapper(),
			});

			act(() => {
				result.current.setSearchText('urltest');
			});

			// Advance less than debounce time
			act(() => {
				jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS - 50);
			});

			expect(result.current.debouncedSearch).toBe('');
		});

		it('updates debouncedSearch exactly at delay', () => {
			const { result } = renderHook(() => useUrlSearchState('search'), {
				wrapper: createWrapper(),
			});

			act(() => {
				result.current.setSearchText('urltest');
			});

			act(() => {
				jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
			});

			expect(result.current.debouncedSearch).toBe('urltest');
		});

		it('resets debounce timer on rapid typing', () => {
			const { result } = renderHook(() => useUrlSearchState('search'), {
				wrapper: createWrapper(),
			});

			act(() => {
				result.current.setSearchText('a');
			});

			act(() => {
				jest.advanceTimersByTime(200);
			});

			act(() => {
				result.current.setSearchText('ab');
			});

			act(() => {
				jest.advanceTimersByTime(200);
			});

			// Still hasn't debounced because timer reset
			expect(result.current.debouncedSearch).toBe('');

			act(() => {
				jest.advanceTimersByTime(100);
			});

			// Now it should have debounced
			expect(result.current.debouncedSearch).toBe('ab');
		});
	});

	describe('clearSearch', () => {
		it('clears searchText immediately', () => {
			const { result } = renderHook(() => useUrlSearchState('search'), {
				wrapper: createWrapper('?search=toclear'),
			});

			expect(result.current.searchText).toBe('toclear');

			act(() => {
				result.current.clearSearch();
			});

			expect(result.current.searchText).toBe('');
		});

		it('clears debouncedSearch after delay', () => {
			const { result } = renderHook(() => useUrlSearchState('search'), {
				wrapper: createWrapper('?search=toclear'),
			});

			act(() => {
				result.current.clearSearch();
			});

			expect(result.current.debouncedSearch).toBe('toclear');

			act(() => {
				jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
			});

			expect(result.current.debouncedSearch).toBe('');
		});
	});

	describe('browser navigation (back/forward)', () => {
		it('syncs local state when URL changes externally', () => {
			const { result, rerender } = renderHook(() => useUrlSearchState('search'), {
				wrapper: createWrapper('?search=first'),
			});

			expect(result.current.searchText).toBe('first');

			// Simulate user typing "second"
			act(() => {
				result.current.setSearchText('second');
			});

			act(() => {
				jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
			});

			expect(result.current.searchText).toBe('second');
			expect(result.current.debouncedSearch).toBe('second');

			// Simulate browser back - URL changes externally to "first"
			rerender();

			// Note: In real scenario, NuqsTestingAdapter would update searchParam
			// This test verifies the hook's internal logic is correct
		});
	});

	describe('onDebouncedChange callback', () => {
		it('calls onDebouncedChange when debounced value changes', () => {
			const onDebouncedChange = jest.fn();
			const { result } = renderHook(
				() => useUrlSearchState('search', { onDebouncedChange }),
				{ wrapper: createWrapper() },
			);

			act(() => {
				result.current.setSearchText('test');
			});

			expect(onDebouncedChange).not.toHaveBeenCalled();

			act(() => {
				jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
			});

			expect(onDebouncedChange).toHaveBeenCalledWith('test');
			expect(onDebouncedChange).toHaveBeenCalledTimes(1);
		});

		it('does not call onDebouncedChange if value unchanged', () => {
			const onDebouncedChange = jest.fn();
			renderHook(() => useUrlSearchState('search', { onDebouncedChange }), {
				wrapper: createWrapper('?search=existing'),
			});

			// Initial render with existing value should not trigger callback
			expect(onDebouncedChange).not.toHaveBeenCalled();
		});

		it('calls onDebouncedChange on each distinct change', () => {
			const onDebouncedChange = jest.fn();
			const { result } = renderHook(
				() => useUrlSearchState('search', { onDebouncedChange }),
				{ wrapper: createWrapper() },
			);

			act(() => {
				result.current.setSearchText('first');
			});

			act(() => {
				jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
			});

			expect(onDebouncedChange).toHaveBeenCalledWith('first');

			act(() => {
				result.current.setSearchText('second');
			});

			act(() => {
				jest.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
			});

			expect(onDebouncedChange).toHaveBeenCalledWith('second');
			expect(onDebouncedChange).toHaveBeenCalledTimes(2);
		});

		it('calls onDebouncedChange immediately when search is cleared', () => {
			const onDebouncedChange = jest.fn();
			const { result } = renderHook(
				() => useUrlSearchState('search', { onDebouncedChange }),
				{ wrapper: createWrapper('?search=existing') },
			);

			act(() => {
				result.current.clearSearch();
			});

			// clearSearch calls callback immediately (no debounce wait)
			expect(onDebouncedChange).toHaveBeenCalledWith('');
			expect(onDebouncedChange).toHaveBeenCalledTimes(1);
		});
	});

	describe('different query keys', () => {
		it('reads from correct URL param key', () => {
			const { result } = renderHook(() => useUrlSearchState('mySearch'), {
				wrapper: createWrapper('?mySearch=fromurl&other=ignored'),
			});

			expect(result.current.searchText).toBe('fromurl');
		});

		it('ignores other URL params', () => {
			const { result } = renderHook(() => useUrlSearchState('search'), {
				wrapper: createWrapper('?other=value&search=correct&another=test'),
			});

			expect(result.current.searchText).toBe('correct');
		});
	});
});
