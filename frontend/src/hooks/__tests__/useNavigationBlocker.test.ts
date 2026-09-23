import { act, renderHook } from '@testing-library/react';

import { useNavigationBlocker } from '../useNavigationBlocker';

const mockUnblock = jest.fn();
const mockBlock = jest.fn().mockReturnValue(mockUnblock);
const mockRetry = jest.fn();

jest.mock('lib/router/navigation', () => ({
	blockNavigation: (blocker: unknown): unknown => mockBlock(blocker),
}));

describe('useNavigationBlocker', () => {
	const mockLocation = {
		pathname: '/new-route',
		search: '',
		hash: '',
		state: null,
		key: 'test-key',
	};

	/**
	 * history@5 hands the blocker one transition object and cancels the
	 * navigation on its own; `retry()` is the only way through, which is why
	 * these cases assert on `retry` rather than on a returned `false`.
	 */
	function transition(action: string): {
		location: typeof mockLocation;
		action: string;
		retry: jest.Mock;
	} {
		return { location: mockLocation, action, retry: mockRetry };
	}

	beforeEach(() => {
		jest.clearAllMocks();
		mockBlock.mockReturnValue(mockUnblock);
	});

	describe('initial state', () => {
		it('returns isBlocked false when shouldBlock is false', () => {
			const { result } = renderHook(() => useNavigationBlocker(false));

			expect(result.current.isBlocked).toBe(false);
			expect(result.current.blockedNavigationDetails).toBeNull();
		});

		it('returns isBlocked false when shouldBlock is true but no navigation attempted', () => {
			const { result } = renderHook(() => useNavigationBlocker(true));

			expect(result.current.isBlocked).toBe(false);
			expect(result.current.blockedNavigationDetails).toBeNull();
		});
	});

	describe('blockNavigation behavior', () => {
		it('registers a blocker when shouldBlock is true', () => {
			renderHook(() => useNavigationBlocker(true));

			expect(mockBlock).toHaveBeenCalledTimes(1);
			expect(mockBlock).toHaveBeenCalledWith(expect.any(Function));
		});

		it('does not register a blocker when shouldBlock is false', () => {
			renderHook(() => useNavigationBlocker(false));

			expect(mockBlock).not.toHaveBeenCalled();
		});

		it('unblocks when shouldBlock changes from true to false', () => {
			const { rerender } = renderHook(
				({ shouldBlock }) => useNavigationBlocker(shouldBlock),
				{ initialProps: { shouldBlock: true } },
			);

			expect(mockBlock).toHaveBeenCalledTimes(1);

			rerender({ shouldBlock: false });

			expect(mockUnblock).toHaveBeenCalledTimes(1);
		});

		it('unblocks on unmount when blocking', () => {
			const { unmount } = renderHook(() => useNavigationBlocker(true));

			unmount();

			expect(mockUnblock).toHaveBeenCalledTimes(1);
		});

		it('does not call unblock on unmount when not blocking', () => {
			const { unmount } = renderHook(() => useNavigationBlocker(false));

			unmount();

			expect(mockUnblock).not.toHaveBeenCalled();
		});
	});

	describe('navigation blocking', () => {
		it('blocks PUSH navigation and sets blockedNavigationDetails', () => {
			const { result } = renderHook(() => useNavigationBlocker(true));

			const blockCallback = mockBlock.mock.calls[0][0];

			act(() => {
				blockCallback(transition('PUSH'));
			});

			expect(mockRetry).not.toHaveBeenCalled();
			expect(result.current.isBlocked).toBe(true);
			expect(result.current.blockedNavigationDetails).toStrictEqual({
				location: mockLocation,
				action: 'PUSH',
			});
		});

		it('blocks REPLACE navigation and sets blockedNavigationDetails', () => {
			const { result } = renderHook(() => useNavigationBlocker(true));

			const blockCallback = mockBlock.mock.calls[0][0];

			act(() => {
				blockCallback(transition('REPLACE'));
			});

			expect(result.current.isBlocked).toBe(true);
			expect(result.current.blockedNavigationDetails?.action).toBe('REPLACE');
		});

		it('blocks POP navigation and sets blockedNavigationDetails', () => {
			const { result } = renderHook(() => useNavigationBlocker(true));

			const blockCallback = mockBlock.mock.calls[0][0];

			act(() => {
				blockCallback(transition('POP'));
			});

			expect(result.current.isBlocked).toBe(true);
			expect(result.current.blockedNavigationDetails?.action).toBe('POP');
		});
	});

	describe('confirmNavigation', () => {
		it('does nothing when no blockedNavigationDetails', () => {
			const { result } = renderHook(() => useNavigationBlocker(true));

			act(() => {
				result.current.confirmNavigation();
			});

			expect(mockRetry).not.toHaveBeenCalled();
		});

		it('unblocks before retrying, or history@5 would block the retry too', () => {
			const { result } = renderHook(() => useNavigationBlocker(true));

			const blockCallback = mockBlock.mock.calls[0][0];

			act(() => {
				blockCallback(transition('PUSH'));
			});

			act(() => {
				result.current.confirmNavigation();
			});

			expect(mockUnblock).toHaveBeenCalled();
			expect(mockUnblock.mock.invocationCallOrder[0]).toBeLessThan(
				mockRetry.mock.invocationCallOrder[0],
			);
			expect(result.current.isBlocked).toBe(false);
			expect(result.current.blockedNavigationDetails).toBeNull();
		});

		it.each(['PUSH', 'REPLACE', 'POP'])(
			'retries the blocked %s, which replays it with its own action',
			(action) => {
				const { result } = renderHook(() => useNavigationBlocker(true));

				const blockCallback = mockBlock.mock.calls[0][0];

				act(() => {
					blockCallback(transition(action));
				});

				act(() => {
					result.current.confirmNavigation();
				});

				expect(mockRetry).toHaveBeenCalledTimes(1);
			},
		);
	});

	describe('cancelNavigation', () => {
		it('clears blockedNavigationDetails without performing navigation', () => {
			const { result } = renderHook(() => useNavigationBlocker(true));

			const blockCallback = mockBlock.mock.calls[0][0];

			act(() => {
				blockCallback(transition('PUSH'));
			});

			expect(result.current.isBlocked).toBe(true);

			act(() => {
				result.current.cancelNavigation();
			});

			expect(result.current.isBlocked).toBe(false);
			expect(result.current.blockedNavigationDetails).toBeNull();
			expect(mockRetry).not.toHaveBeenCalled();
		});
	});

	describe('allowNextNavigation', () => {
		it('bypasses blocking for next navigation only', () => {
			const { result } = renderHook(() => useNavigationBlocker(true));

			act(() => {
				result.current.allowNextNavigation();
			});

			const blockCallback = mockBlock.mock.calls[0][0];

			act(() => {
				blockCallback(transition('PUSH'));
			});

			// The bypass has to let the transition through itself: history@5
			// cancels every navigation while a blocker is registered.
			expect(mockRetry).toHaveBeenCalledTimes(1);
			expect(result.current.isBlocked).toBe(false);
			// ...and re-arm, or one bypass would disarm the blocker for good.
			expect(mockBlock).toHaveBeenCalledTimes(2);
		});

		it('resumes blocking after bypassed navigation', () => {
			const { result } = renderHook(() => useNavigationBlocker(true));

			const blockCallback = mockBlock.mock.calls[0][0];

			act(() => {
				result.current.allowNextNavigation();
			});

			act(() => {
				blockCallback(transition('PUSH'));
			});

			mockRetry.mockClear();
			act(() => {
				blockCallback(transition('PUSH'));
			});

			expect(mockRetry).not.toHaveBeenCalled();
			expect(result.current.isBlocked).toBe(true);
		});

		it('resets bypass flag when shouldBlock changes to false before navigation', () => {
			const { result, rerender } = renderHook(
				({ shouldBlock }) => useNavigationBlocker(shouldBlock),
				{ initialProps: { shouldBlock: true } },
			);

			act(() => {
				result.current.allowNextNavigation();
			});

			rerender({ shouldBlock: false });
			rerender({ shouldBlock: true });

			const blockCallback = mockBlock.mock.calls[1][0];

			act(() => {
				blockCallback(transition('PUSH'));
			});

			expect(mockRetry).not.toHaveBeenCalled();
			expect(result.current.isBlocked).toBe(true);
		});
	});

	describe('beforeunload event', () => {
		let addEventListenerSpy: jest.SpyInstance;
		let removeEventListenerSpy: jest.SpyInstance;

		beforeEach(() => {
			addEventListenerSpy = jest.spyOn(window, 'addEventListener');
			removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
		});

		afterEach(() => {
			addEventListenerSpy.mockRestore();
			removeEventListenerSpy.mockRestore();
		});

		it('adds beforeunload listener when shouldBlock is true', () => {
			renderHook(() => useNavigationBlocker(true));

			expect(addEventListenerSpy).toHaveBeenCalledWith(
				'beforeunload',
				expect.any(Function),
			);
		});

		it('does not add beforeunload listener when shouldBlock is false', () => {
			renderHook(() => useNavigationBlocker(false));

			expect(addEventListenerSpy).not.toHaveBeenCalledWith(
				'beforeunload',
				expect.any(Function),
			);
		});

		it('removes beforeunload listener on unmount', () => {
			const { unmount } = renderHook(() => useNavigationBlocker(true));

			unmount();

			expect(removeEventListenerSpy).toHaveBeenCalledWith(
				'beforeunload',
				expect.any(Function),
			);
		});

		it('removes beforeunload listener when shouldBlock changes to false', () => {
			const { rerender } = renderHook(
				({ shouldBlock }) => useNavigationBlocker(shouldBlock),
				{ initialProps: { shouldBlock: true } },
			);

			rerender({ shouldBlock: false });

			expect(removeEventListenerSpy).toHaveBeenCalledWith(
				'beforeunload',
				expect.any(Function),
			);
		});

		it('beforeunload handler calls preventDefault', () => {
			renderHook(() => useNavigationBlocker(true));

			const beforeUnloadHandler = addEventListenerSpy.mock.calls.find(
				(call) => call[0] === 'beforeunload',
			)?.[1];

			const mockEvent = {
				preventDefault: jest.fn(),
			};

			const result = beforeUnloadHandler(mockEvent);

			expect(mockEvent.preventDefault).toHaveBeenCalled();
			expect(result).toBeUndefined();
		});
	});
});
