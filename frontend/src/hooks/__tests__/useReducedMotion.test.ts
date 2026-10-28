import { act, renderHook } from '@testing-library/react';
import useReducedMotion from 'hooks/useReducedMotion';

type ChangeListener = (e: Partial<MediaQueryListEvent>) => void;

function mockMatchMedia(matches: boolean): {
	setMatches: (next: boolean) => void;
} {
	const listeners: ChangeListener[] = [];
	let currentMatches = matches;

	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: jest.fn(() => ({
			get matches() {
				return currentMatches;
			},
			addEventListener: jest.fn((_: string, fn: ChangeListener) => {
				listeners.push(fn);
			}),
			removeEventListener: jest.fn(),
		})),
	});

	return {
		setMatches: (next: boolean): void => {
			currentMatches = next;
			listeners.forEach((fn) => fn({ matches: next } as MediaQueryListEvent));
		},
	};
}

describe('useReducedMotion', () => {
	it('returns false when prefers-reduced-motion is not set', () => {
		mockMatchMedia(false);
		const { result } = renderHook(() => useReducedMotion());
		expect(result.current).toBe(false);
	});

	it('returns true when prefers-reduced-motion: reduce is active', () => {
		mockMatchMedia(true);
		const { result } = renderHook(() => useReducedMotion());
		expect(result.current).toBe(true);
	});

	it('updates when system preference changes at runtime', () => {
		const { setMatches } = mockMatchMedia(false);
		const { result } = renderHook(() => useReducedMotion());
		expect(result.current).toBe(false);

		act(() => {
			setMatches(true);
		});
		expect(result.current).toBe(true);

		act(() => {
			setMatches(false);
		});
		expect(result.current).toBe(false);
	});

	it('removes event listener on unmount', () => {
		const removeEventListener = jest.fn();
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: jest.fn(() => ({
				matches: false,
				addEventListener: jest.fn(),
				removeEventListener,
			})),
		});

		const { unmount } = renderHook(() => useReducedMotion());
		unmount();
		expect(removeEventListener).toHaveBeenCalledWith(
			'change',
			expect.any(Function),
		);
	});
});
