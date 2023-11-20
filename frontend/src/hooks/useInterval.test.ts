import { act, renderHook } from '@testing-library/react';

import useInterval from './useInterval';

jest.useFakeTimers();

describe('useInterval', () => {
	test('calls the callback with a given delay', () => {
		const callback = jest.fn();
		const delay = 1000;

		renderHook(() => useInterval(callback, delay));

		expect(callback).toHaveBeenCalledTimes(0);

		act(() => {
			jest.advanceTimersByTime(delay);
		});

		expect(callback).toHaveBeenCalledTimes(1);

		act(() => {
			jest.advanceTimersByTime(delay);
		});

		expect(callback).toHaveBeenCalledTimes(2);
	});

	test('does not call the callback if not enabled', () => {
		const callback = jest.fn();
		const delay = 1000;
		const enabled = false;

		renderHook(() => useInterval(callback, delay, enabled));

		act(() => {
			jest.advanceTimersByTime(delay);
		});

		expect(callback).toHaveBeenCalledTimes(0);
	});

	test('cleans up the interval when unmounted', () => {
		const callback = jest.fn();
		const delay = 1000;

		const { unmount } = renderHook(() => useInterval(callback, delay));

		act(() => {
			jest.advanceTimersByTime(delay);
		});

		expect(callback).toHaveBeenCalledTimes(1);

		unmount();

		act(() => {
			jest.advanceTimersByTime(delay);
		});

		expect(callback).toHaveBeenCalledTimes(1);
	});

	test('updates the interval when delay changes', () => {
		const callback = jest.fn();
		const initialDelay = 1000;
		const newDelay = 2000;

		const { rerender } = renderHook(({ delay }) => useInterval(callback, delay), {
			initialProps: { delay: initialDelay },
		});

		act(() => {
			jest.advanceTimersByTime(initialDelay);
		});

		expect(callback).toHaveBeenCalledTimes(1);

		rerender({ delay: newDelay });

		act(() => {
			jest.advanceTimersByTime(initialDelay);
		});

		expect(callback).toHaveBeenCalledTimes(1);

		act(() => {
			jest.advanceTimersByTime(newDelay - initialDelay);
		});

		expect(callback).toHaveBeenCalledTimes(2);
	});
});
