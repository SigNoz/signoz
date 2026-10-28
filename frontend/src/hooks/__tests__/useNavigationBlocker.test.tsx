import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { back, getCurrentLocation, navigate } from 'lib/router/navigation';
import { TestRouter } from 'tests/router';

import { useNavigationBlocker } from '../useNavigationBlocker';

function wrapper({ children }: { children: ReactNode }): JSX.Element {
	return <TestRouter initialRoute="/start">{children}</TestRouter>;
}

/** Lets router updates, and the `popstate` a POP arrives on, reach React. */
async function settle(): Promise<void> {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 0));
	});
}

describe('useNavigationBlocker', () => {
	describe('initial state', () => {
		it('returns isBlocked false when shouldBlock is false', () => {
			const { result } = renderHook(() => useNavigationBlocker(false), {
				wrapper,
			});

			expect(result.current.isBlocked).toBe(false);
			expect(result.current.blockedNavigationDetails).toBeNull();
		});

		it('returns isBlocked false when shouldBlock is true but no navigation attempted', () => {
			const { result } = renderHook(() => useNavigationBlocker(true), {
				wrapper,
			});

			expect(result.current.isBlocked).toBe(false);
			expect(result.current.blockedNavigationDetails).toBeNull();
		});
	});

	describe('navigation blocking', () => {
		it('lets navigation through when shouldBlock is false', async () => {
			renderHook(() => useNavigationBlocker(false), { wrapper });

			navigate('/next');
			await settle();

			expect(getCurrentLocation().pathname).toBe('/next');
		});

		it('blocks PUSH navigation and sets blockedNavigationDetails', async () => {
			const { result } = renderHook(() => useNavigationBlocker(true), {
				wrapper,
			});

			navigate('/next');
			await settle();

			expect(result.current.isBlocked).toBe(true);
			expect(result.current.blockedNavigationDetails).toMatchObject({
				location: { pathname: '/next' },
				action: 'PUSH',
			});
			expect(getCurrentLocation().pathname).toBe('/start');
		});

		it('blocks REPLACE navigation and sets blockedNavigationDetails', async () => {
			const { result } = renderHook(() => useNavigationBlocker(true), {
				wrapper,
			});

			navigate('/next', { replace: true });
			await settle();

			expect(result.current.blockedNavigationDetails?.action).toBe('REPLACE');
		});

		it('blocks POP navigation and sets blockedNavigationDetails', async () => {
			const { result, rerender } = renderHook(
				({ shouldBlock }) => useNavigationBlocker(shouldBlock),
				{ wrapper, initialProps: { shouldBlock: false } },
			);
			navigate('/next');
			await settle();
			rerender({ shouldBlock: true });
			await settle();

			back();
			await waitFor(() => expect(result.current.isBlocked).toBe(true));

			expect(result.current.blockedNavigationDetails).toMatchObject({
				location: { pathname: '/start' },
				action: 'POP',
			});
			await waitFor(() => expect(getCurrentLocation().pathname).toBe('/next'));
		});

		it('stops blocking when shouldBlock changes from true to false', async () => {
			const { rerender } = renderHook(
				({ shouldBlock }) => useNavigationBlocker(shouldBlock),
				{ wrapper, initialProps: { shouldBlock: true } },
			);

			rerender({ shouldBlock: false });
			navigate('/next');
			await settle();

			expect(getCurrentLocation().pathname).toBe('/next');
		});
	});

	describe('confirmNavigation', () => {
		it('does nothing when nothing is blocked', () => {
			const { result } = renderHook(() => useNavigationBlocker(true), {
				wrapper,
			});

			act(() => result.current.confirmNavigation());

			expect(getCurrentLocation().pathname).toBe('/start');
		});

		it('completes the blocked navigation', async () => {
			const { result } = renderHook(() => useNavigationBlocker(true), {
				wrapper,
			});
			navigate('/next', { state: { from: 'test' } });
			await settle();

			act(() => result.current.confirmNavigation());
			await settle();

			expect(getCurrentLocation()).toMatchObject({
				pathname: '/next',
				state: { from: 'test' },
			});
			expect(result.current.isBlocked).toBe(false);
		});

		it('keeps a blocked REPLACE a replace', async () => {
			const { result } = renderHook(() => useNavigationBlocker(true), {
				wrapper,
			});
			const before = window.history.length;
			navigate('/next', { replace: true });
			await settle();

			act(() => result.current.confirmNavigation());
			await settle();

			expect(getCurrentLocation().pathname).toBe('/next');
			expect(window.history).toHaveLength(before);
		});
	});

	describe('cancelNavigation', () => {
		it('clears blockedNavigationDetails without performing navigation', async () => {
			const { result } = renderHook(() => useNavigationBlocker(true), {
				wrapper,
			});
			navigate('/next');
			await settle();

			act(() => result.current.cancelNavigation());
			await settle();

			expect(result.current.isBlocked).toBe(false);
			expect(result.current.blockedNavigationDetails).toBeNull();
			expect(getCurrentLocation().pathname).toBe('/start');
		});

		it('keeps blocking after a cancel', async () => {
			const { result } = renderHook(() => useNavigationBlocker(true), {
				wrapper,
			});
			navigate('/next');
			await settle();
			act(() => result.current.cancelNavigation());
			await settle();

			navigate('/next');
			await settle();

			expect(result.current.isBlocked).toBe(true);
		});
	});

	describe('allowNextNavigation', () => {
		it('bypasses blocking for next navigation only', async () => {
			const { result } = renderHook(() => useNavigationBlocker(true), {
				wrapper,
			});

			act(() => result.current.allowNextNavigation());
			navigate('/next');
			await settle();

			expect(getCurrentLocation().pathname).toBe('/next');
			expect(result.current.isBlocked).toBe(false);

			navigate('/after');
			await settle();

			expect(result.current.isBlocked).toBe(true);
			expect(getCurrentLocation().pathname).toBe('/next');
		});

		it('drops a pending prompt when a bypassed navigation goes through', async () => {
			const { result } = renderHook(() => useNavigationBlocker(true), {
				wrapper,
			});

			navigate('/next');
			await settle();
			expect(result.current.isBlocked).toBe(true);

			act(() => result.current.allowNextNavigation());
			navigate('/other');
			await settle();

			expect(getCurrentLocation().pathname).toBe('/other');
			expect(result.current.isBlocked).toBe(false);
		});

		it('resets bypass flag when shouldBlock changes to false before navigation', async () => {
			const { result, rerender } = renderHook(
				({ shouldBlock }) => useNavigationBlocker(shouldBlock),
				{ wrapper, initialProps: { shouldBlock: true } },
			);

			act(() => result.current.allowNextNavigation());
			rerender({ shouldBlock: false });
			rerender({ shouldBlock: true });

			navigate('/next');
			await settle();

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
			renderHook(() => useNavigationBlocker(true), { wrapper });

			expect(addEventListenerSpy).toHaveBeenCalledWith(
				'beforeunload',
				expect.any(Function),
			);
		});

		it('does not add beforeunload listener when shouldBlock is false', () => {
			renderHook(() => useNavigationBlocker(false), { wrapper });

			expect(addEventListenerSpy).not.toHaveBeenCalledWith(
				'beforeunload',
				expect.any(Function),
			);
		});

		it('removes beforeunload listener on unmount', () => {
			const { unmount } = renderHook(() => useNavigationBlocker(true), {
				wrapper,
			});

			unmount();

			expect(removeEventListenerSpy).toHaveBeenCalledWith(
				'beforeunload',
				expect.any(Function),
			);
		});

		it('removes beforeunload listener when shouldBlock changes to false', () => {
			const { rerender } = renderHook(
				({ shouldBlock }) => useNavigationBlocker(shouldBlock),
				{ wrapper, initialProps: { shouldBlock: true } },
			);

			rerender({ shouldBlock: false });

			expect(removeEventListenerSpy).toHaveBeenCalledWith(
				'beforeunload',
				expect.any(Function),
			);
		});

		it('beforeunload handler calls preventDefault', () => {
			renderHook(() => useNavigationBlocker(true), { wrapper });

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
