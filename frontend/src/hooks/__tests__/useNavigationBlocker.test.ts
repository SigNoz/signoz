import { act, renderHook } from '@testing-library/react';

import { useNavigationBlocker } from '../useNavigationBlocker';

const mockUnblock = jest.fn();
const mockBlock = jest.fn().mockReturnValue(mockUnblock);
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useHistory: (): object => ({
		block: mockBlock,
		push: mockPush,
		replace: mockReplace,
		goBack: mockGoBack,
	}),
}));

describe('useNavigationBlocker', () => {
	const mockLocation = {
		pathname: '/new-route',
		search: '',
		hash: '',
		state: null,
		key: 'test-key',
	};

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

	describe('history.block behavior', () => {
		it('calls history.block when shouldBlock is true', () => {
			renderHook(() => useNavigationBlocker(true));

			expect(mockBlock).toHaveBeenCalledTimes(1);
			expect(mockBlock).toHaveBeenCalledWith(expect.any(Function));
		});

		it('does not call history.block when shouldBlock is false', () => {
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
			let blockResult: boolean | undefined;

			act(() => {
				blockResult = blockCallback(mockLocation, 'PUSH');
			});

			expect(blockResult).toBe(false);
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
				blockCallback(mockLocation, 'REPLACE');
			});

			expect(result.current.isBlocked).toBe(true);
			expect(result.current.blockedNavigationDetails?.action).toBe('REPLACE');
		});

		it('blocks POP navigation and sets blockedNavigationDetails', () => {
			const { result } = renderHook(() => useNavigationBlocker(true));

			const blockCallback = mockBlock.mock.calls[0][0];

			act(() => {
				blockCallback(mockLocation, 'POP');
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

			expect(mockPush).not.toHaveBeenCalled();
			expect(mockReplace).not.toHaveBeenCalled();
			expect(mockGoBack).not.toHaveBeenCalled();
		});

		it('performs PUSH navigation when confirming blocked PUSH', () => {
			const { result } = renderHook(() => useNavigationBlocker(true));

			const blockCallback = mockBlock.mock.calls[0][0];

			act(() => {
				blockCallback(mockLocation, 'PUSH');
			});

			act(() => {
				result.current.confirmNavigation();
			});

			expect(mockUnblock).toHaveBeenCalled();
			expect(mockPush).toHaveBeenCalledWith(mockLocation);
			expect(result.current.isBlocked).toBe(false);
			expect(result.current.blockedNavigationDetails).toBeNull();
		});

		it('performs REPLACE navigation when confirming blocked REPLACE', () => {
			const { result } = renderHook(() => useNavigationBlocker(true));

			const blockCallback = mockBlock.mock.calls[0][0];

			act(() => {
				blockCallback(mockLocation, 'REPLACE');
			});

			act(() => {
				result.current.confirmNavigation();
			});

			expect(mockReplace).toHaveBeenCalledWith(mockLocation);
		});

		it('performs goBack when confirming blocked POP', () => {
			const { result } = renderHook(() => useNavigationBlocker(true));

			const blockCallback = mockBlock.mock.calls[0][0];

			act(() => {
				blockCallback(mockLocation, 'POP');
			});

			act(() => {
				result.current.confirmNavigation();
			});

			expect(mockGoBack).toHaveBeenCalled();
		});
	});

	describe('cancelNavigation', () => {
		it('clears blockedNavigationDetails without performing navigation', () => {
			const { result } = renderHook(() => useNavigationBlocker(true));

			const blockCallback = mockBlock.mock.calls[0][0];

			act(() => {
				blockCallback(mockLocation, 'PUSH');
			});

			expect(result.current.isBlocked).toBe(true);

			act(() => {
				result.current.cancelNavigation();
			});

			expect(result.current.isBlocked).toBe(false);
			expect(result.current.blockedNavigationDetails).toBeNull();
			expect(mockPush).not.toHaveBeenCalled();
			expect(mockReplace).not.toHaveBeenCalled();
			expect(mockGoBack).not.toHaveBeenCalled();
		});
	});

	describe('allowNextNavigation', () => {
		it('bypasses blocking for next navigation only', () => {
			const { result } = renderHook(() => useNavigationBlocker(true));

			act(() => {
				result.current.allowNextNavigation();
			});

			const blockCallback = mockBlock.mock.calls[0][0];
			let blockResult: boolean | undefined;

			act(() => {
				blockResult = blockCallback(mockLocation, 'PUSH');
			});

			expect(blockResult).toBeUndefined();
			expect(result.current.isBlocked).toBe(false);
		});

		it('resumes blocking after bypassed navigation', () => {
			const { result } = renderHook(() => useNavigationBlocker(true));

			const blockCallback = mockBlock.mock.calls[0][0];

			act(() => {
				result.current.allowNextNavigation();
			});

			act(() => {
				blockCallback(mockLocation, 'PUSH');
			});

			let blockResult: boolean | undefined;
			act(() => {
				blockResult = blockCallback(mockLocation, 'PUSH');
			});

			expect(blockResult).toBe(false);
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
			let blockResult: boolean | undefined;

			act(() => {
				blockResult = blockCallback(mockLocation, 'PUSH');
			});

			expect(blockResult).toBe(false);
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
