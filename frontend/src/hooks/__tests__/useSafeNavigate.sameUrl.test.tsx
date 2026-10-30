import { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { TestRouter } from 'tests/router';

// jest.config.ts maps every `useSafeNavigate` import to a mock; the extension
// slips past that mapping.
const { useSafeNavigate } = jest.requireActual<
	typeof import('hooks/useSafeNavigate')
>('../useSafeNavigate.ts');

function wrapper({ children }: { children: ReactNode }): JSX.Element {
	return <TestRouter initialRoute="/page?a=1">{children}</TestRouter>;
}

describe('useSafeNavigate same-URL check', () => {
	let pushState: jest.SpyInstance;
	let replaceState: jest.SpyInstance;

	beforeEach(() => {
		pushState = jest.spyOn(window.history, 'pushState');
		replaceState = jest.spyOn(window.history, 'replaceState');
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	function render(): ReturnType<typeof useSafeNavigate>['safeNavigate'] {
		const { result } = renderHook(() => useSafeNavigate(), { wrapper });
		pushState.mockClear();
		replaceState.mockClear();
		return result.current.safeNavigate;
	}

	it('navigates to a different URL', () => {
		const safeNavigate = render();

		safeNavigate('/page?a=2');

		expect(pushState).toHaveBeenCalledTimes(1);
		expect(window.location.search).toBe('?a=2');
	});

	it('skips the URL the router is on', () => {
		const safeNavigate = render();

		safeNavigate('/page?a=1');

		expect(pushState).not.toHaveBeenCalled();
		expect(replaceState).not.toHaveBeenCalled();
	});

	it('skips the URL a shallow write published ahead of the router', () => {
		const safeNavigate = render();
		// A nuqs write: it reaches the address bar but not the router.
		window.history.replaceState(window.history.state, '', '/page?a=1&b=1');
		replaceState.mockClear();

		safeNavigate('/page?a=1&b=1');

		expect(pushState).not.toHaveBeenCalled();
		expect(replaceState).not.toHaveBeenCalled();
	});
});
