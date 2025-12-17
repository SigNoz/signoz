import { act, renderHook } from '@testing-library/react';

import { useShiftHoldOverlay } from '../useShiftHoldOverlay';

jest.useFakeTimers();

function pressShift(target: EventTarget = window): void {
	const event = new KeyboardEvent('keydown', {
		key: 'Shift',
		bubbles: true,
	});
	Object.defineProperty(event, 'target', { value: target });
	window.dispatchEvent(event);
}

function releaseShift(): void {
	window.dispatchEvent(
		new KeyboardEvent('keyup', {
			key: 'Shift',
			bubbles: true,
		}),
	);
}

describe('useShiftHoldOverlay', () => {
	afterEach(() => {
		jest.clearAllTimers();
	});

	it('shows overlay after holding Shift for 600ms', () => {
		const { result } = renderHook(() => useShiftHoldOverlay({}));

		act(() => {
			pressShift();
			jest.advanceTimersByTime(600);
		});

		expect(result.current).toBe(true);
	});

	it('does not show overlay if Shift is released early', () => {
		const { result } = renderHook(() => useShiftHoldOverlay({}));

		act(() => {
			pressShift();
			jest.advanceTimersByTime(300);
			releaseShift();
			jest.advanceTimersByTime(600);
		});

		expect(result.current).toBe(false);
	});

	it('hides overlay on Shift key release', () => {
		const { result } = renderHook(() => useShiftHoldOverlay({}));

		act(() => {
			pressShift();
			jest.advanceTimersByTime(600);
		});

		expect(result.current).toBe(true);

		act(() => {
			releaseShift();
		});

		expect(result.current).toBe(false);
	});

	it('does not activate when modal is open', () => {
		const { result } = renderHook(() =>
			useShiftHoldOverlay({ isModalOpen: true }),
		);

		act(() => {
			pressShift();
			jest.advanceTimersByTime(600);
		});

		expect(result.current).toBe(false);
	});

	it('does not activate in typing context (input)', () => {
		const input = document.createElement('input');
		document.body.appendChild(input);

		const { result } = renderHook(() => useShiftHoldOverlay({}));

		act(() => {
			pressShift(input);
			jest.advanceTimersByTime(600);
		});

		expect(result.current).toBe(false);

		document.body.removeChild(input);
	});

	it('cleans up on window blur', () => {
		const { result } = renderHook(() => useShiftHoldOverlay({}));

		act(() => {
			pressShift();
			jest.advanceTimersByTime(600);
		});

		expect(result.current).toBe(true);

		act(() => {
			window.dispatchEvent(new Event('blur'));
		});

		expect(result.current).toBe(false);
	});

	it('cleans up on document visibility change', () => {
		const { result } = renderHook(() => useShiftHoldOverlay({}));

		act(() => {
			pressShift();
			jest.advanceTimersByTime(600);
		});

		expect(result.current).toBe(true);

		act(() => {
			document.dispatchEvent(new Event('visibilitychange'));
		});

		expect(result.current).toBe(false);
	});

	it('does nothing when disabled', () => {
		const { result } = renderHook(() => useShiftHoldOverlay({ disabled: true }));

		act(() => {
			pressShift();
			jest.advanceTimersByTime(600);
		});

		expect(result.current).toBe(false);
	});
});
