import { renderHook } from '@testing-library/react';

import useDebouncedFn from '../useDebouncedFunction';

describe('useDebouncedFn', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('should debounce function execution', () => {
		const callback = jest.fn();
		const { result } = renderHook(() => useDebouncedFn(callback, 300));

		result.current('first');
		result.current('second');

		expect(callback).not.toHaveBeenCalled();

		jest.advanceTimersByTime(299);
		expect(callback).not.toHaveBeenCalled();

		jest.advanceTimersByTime(1);
		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledWith('second');
	});

	it('should cancel pending execution when unmounted (Bug 55)', () => {
		const callback = jest.fn();
		const { result, unmount } = renderHook(() => useDebouncedFn(callback, 300));

		result.current('pending');
		expect(callback).not.toHaveBeenCalled();

		unmount();

		jest.advanceTimersByTime(500);
		expect(callback).not.toHaveBeenCalled();
	});
});
