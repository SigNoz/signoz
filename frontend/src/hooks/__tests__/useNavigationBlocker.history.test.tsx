import type { ReactNode } from 'react';
import { act, renderHook, type RenderHookResult } from '@testing-library/react';
import { getCurrentLocation, navigate } from 'lib/router/navigation';
import { TestRouter } from 'tests/router';

import { useNavigationBlocker } from '../useNavigationBlocker';

type BlockerHook = RenderHookResult<
	ReturnType<typeof useNavigationBlocker>,
	{ shouldBlock: boolean }
>;

function wrapper({ children }: { children: ReactNode }): JSX.Element {
	return <TestRouter initialRoute="/start">{children}</TestRouter>;
}

/** Lets router updates, and the `popstate` a POP arrives on, reach React. */
async function settle(): Promise<void> {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 60));
	});
}

/** Mounts the blocker, disarmed, at /c with /start, /a and /b behind it. */
async function renderAtC(): Promise<BlockerHook> {
	const hook = renderHook(
		({ shouldBlock }) => useNavigationBlocker(shouldBlock),
		{ wrapper, initialProps: { shouldBlock: false } },
	);
	navigate('/a');
	navigate('/b');
	navigate('/c');
	await settle();
	return hook;
}

describe('useNavigationBlocker against the real history', () => {
	it('lets a bypassed browser Back through without showing the modal', async () => {
		const { result, rerender } = await renderAtC();
		rerender({ shouldBlock: true });

		act(() => result.current.allowNextNavigation());
		window.history.back();
		await settle();

		expect(getCurrentLocation().pathname).toBe('/b');
		expect(result.current.isBlocked).toBe(false);
	});

	it('keeps blocking after a bypassed navigation', async () => {
		const { result, rerender } = await renderAtC();
		rerender({ shouldBlock: true });

		act(() => result.current.allowNextNavigation());
		window.history.back();
		await settle();
		navigate('/elsewhere');
		await settle();

		expect(getCurrentLocation().pathname).toBe('/b');
		expect(result.current.isBlocked).toBe(true);
	});

	it('replays a blocked Forward on confirm', async () => {
		const { result, rerender } = await renderAtC();
		window.history.go(-2);
		await settle();
		rerender({ shouldBlock: true });

		window.history.forward();
		await settle();

		expect(result.current.isBlocked).toBe(true);
		expect(getCurrentLocation().pathname).toBe('/a');

		act(() => result.current.confirmNavigation());
		await settle();

		expect(getCurrentLocation().pathname).toBe('/b');
	});

	it('replays a blocked multi-entry jump on confirm', async () => {
		const { result, rerender } = await renderAtC();
		window.history.go(-2);
		await settle();
		rerender({ shouldBlock: true });

		window.history.go(2);
		await settle();

		expect(result.current.isBlocked).toBe(true);

		act(() => result.current.confirmNavigation());
		await settle();

		expect(getCurrentLocation().pathname).toBe('/c');
	});
});
