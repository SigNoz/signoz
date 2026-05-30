/* eslint-disable no-restricted-syntax */
import { act, renderHook } from '@testing-library/react';

import {
	getPreferredPageSize,
	usePreferredPageSize,
	usePreferredPageSizeStore,
} from '../usePreferredPageSize.store';

const STORAGE_KEY = 'test-table';
const FULL_STORAGE_KEY = '@signoz/table-columns/test-table-preferred-page-size';

describe('usePreferredPageSize', () => {
	beforeEach(() => {
		localStorage.clear();
		usePreferredPageSizeStore.setState({ tables: {} });
	});

	it('returns null when no stored value exists', () => {
		const { result } = renderHook(() => usePreferredPageSize(STORAGE_KEY));
		expect(result.current[0]).toBeNull();
	});

	it('returns null when storageKey is undefined', () => {
		const { result } = renderHook(() => usePreferredPageSize(undefined));
		expect(result.current[0]).toBeNull();
	});

	it('loads stored page size from localStorage', () => {
		localStorage.setItem(FULL_STORAGE_KEY, '25');
		const { result } = renderHook(() => usePreferredPageSize(STORAGE_KEY));
		expect(result.current[0]).toBe(25);
	});

	it('ignores invalid stored values', () => {
		localStorage.setItem(FULL_STORAGE_KEY, 'invalid');
		const { result } = renderHook(() => usePreferredPageSize(STORAGE_KEY));
		expect(result.current[0]).toBeNull();
	});

	it('persists page size to localStorage when set', () => {
		const { result } = renderHook(() => usePreferredPageSize(STORAGE_KEY));

		act(() => {
			result.current[1](30);
		});

		expect(result.current[0]).toBe(30);
		expect(localStorage.getItem(FULL_STORAGE_KEY)).toBe('30');
	});

	it('removes from localStorage when set to null', () => {
		localStorage.setItem(FULL_STORAGE_KEY, '25');
		const { result } = renderHook(() => usePreferredPageSize(STORAGE_KEY));

		act(() => {
			result.current[1](null);
		});

		expect(result.current[0]).toBeNull();
		expect(localStorage.getItem(FULL_STORAGE_KEY)).toBeNull();
	});

	it('does nothing when storageKey is undefined and set is called', () => {
		const { result } = renderHook(() => usePreferredPageSize(undefined));

		act(() => {
			result.current[1](30);
		});

		expect(result.current[0]).toBeNull();
	});
});

describe('getPreferredPageSize', () => {
	beforeEach(() => {
		localStorage.clear();
		usePreferredPageSizeStore.setState({ tables: {} });
	});

	it('returns null when no stored value exists', () => {
		expect(getPreferredPageSize(STORAGE_KEY)).toBeNull();
	});

	it('returns stored value from localStorage', () => {
		localStorage.setItem(FULL_STORAGE_KEY, '42');
		expect(getPreferredPageSize(STORAGE_KEY)).toBe(42);
	});
});
