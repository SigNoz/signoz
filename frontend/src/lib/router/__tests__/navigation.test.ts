import type { BlockedTransition } from '../types';

/**
 * `lib/history` is a module-level singleton that reads the base path at import
 * time, so every case loads it in isolation with a fresh DOM.
 */
type NavigationModule = typeof import('../navigation');

function loadNavigation(baseHref?: string): NavigationModule {
	if (baseHref !== undefined) {
		const base = document.createElement('base');
		base.setAttribute('href', baseHref);
		document.head.append(base);
	}

	let mod!: NavigationModule;
	jest.isolateModules(() => {
		// oxlint-disable-next-line typescript-eslint/no-require-imports, typescript-eslint/no-var-requires
		mod = require('../navigation');
	});
	return mod;
}

function nextUpdate(
	nav: NavigationModule,
): Promise<{ location: { pathname: string }; action: string }> {
	return new Promise((resolve) => {
		const unsubscribe = nav.subscribe((update) => {
			unsubscribe();
			resolve(update);
		});
	});
}

beforeEach(() => {
	window.history.replaceState(null, '', '/');
});

afterEach(() => {
	for (const element of document.head.querySelectorAll('base')) {
		element.remove();
	}
});

describe('navigate', () => {
	it('pushes a string target', () => {
		const nav = loadNavigation();
		nav.navigate('/logs');
		expect(nav.getCurrentLocation().pathname).toBe('/logs');
	});

	it('carries search and hash from a string target', () => {
		const nav = loadNavigation();
		nav.navigate('/logs?a=1#top');
		expect(nav.getCurrentLocation()).toMatchObject({
			pathname: '/logs',
			search: '?a=1',
			hash: '#top',
		});
	});

	it('pushes an object target', () => {
		const nav = loadNavigation();
		nav.navigate({ pathname: '/logs', search: '?a=1' });
		expect(nav.getCurrentLocation()).toMatchObject({
			pathname: '/logs',
			search: '?a=1',
		});
	});

	it('attaches state to a string target', () => {
		const nav = loadNavigation();
		nav.navigate('/logs', { state: { from: 'test' } });
		expect(nav.getCurrentLocation().state).toStrictEqual({ from: 'test' });
	});

	it('attaches state to an object target', () => {
		const nav = loadNavigation();
		nav.navigate({ pathname: '/logs' }, { state: { from: 'test' } });
		expect(nav.getCurrentLocation().state).toStrictEqual({ from: 'test' });
	});

	it('replaces without adding a history entry', () => {
		const nav = loadNavigation();
		const before = window.history.length;
		nav.navigate('/logs', { replace: true });
		expect(nav.getCurrentLocation().pathname).toBe('/logs');
		expect(window.history).toHaveLength(before);
	});

	it('adds a history entry when pushing', () => {
		const nav = loadNavigation();
		const before = window.history.length;
		nav.navigate('/logs');
		expect(window.history).toHaveLength(before + 1);
	});

	it('does not suppress a same-URL push', () => {
		const nav = loadNavigation();
		nav.navigate('/logs');
		const before = window.history.length;
		nav.navigate('/logs');
		expect(window.history).toHaveLength(before + 1);
	});
});

describe('basename ownership', () => {
	it('takes basename-free paths and writes a prefixed browser URL', () => {
		const nav = loadNavigation('/signoz/');
		nav.navigate('/logs');
		expect(window.location.pathname).toBe('/signoz/logs');
	});

	it('returns a basename-free pathname', () => {
		const nav = loadNavigation('/signoz/');
		nav.navigate('/logs');
		expect(nav.getCurrentLocation().pathname).toBe('/logs');
	});

	it('does not double-prefix a path that already carries the base path', () => {
		const nav = loadNavigation('/signoz/');
		nav.navigate('/logs');
		nav.navigate(nav.getCurrentLocation().pathname);
		expect(window.location.pathname).toBe('/signoz/logs');
	});
});

describe('subscribe', () => {
	it('reports a single update object, not two arguments', async () => {
		const nav = loadNavigation();
		const listener = jest.fn();
		const unsubscribe = nav.subscribe(listener);

		nav.navigate('/logs');

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener.mock.calls[0]).toHaveLength(1);
		expect(listener.mock.calls[0][0]).toMatchObject({
			location: { pathname: '/logs' },
			action: 'PUSH',
		});
		unsubscribe();
	});

	it('reports REPLACE', () => {
		const nav = loadNavigation();
		const listener = jest.fn();
		const unsubscribe = nav.subscribe(listener);

		nav.navigate('/logs', { replace: true });

		expect(listener.mock.calls[0][0].action).toBe('REPLACE');
		unsubscribe();
	});

	it('stops reporting after unsubscribe', () => {
		const nav = loadNavigation();
		const listener = jest.fn();
		nav.subscribe(listener)();

		nav.navigate('/logs');

		expect(listener).not.toHaveBeenCalled();
	});
});

describe('back', () => {
	it('reports POP and restores the previous location', async () => {
		const nav = loadNavigation();
		nav.navigate('/logs');
		nav.navigate('/traces');

		const popped = nextUpdate(nav);
		nav.back();
		const update = await popped;

		expect(update.action).toBe('POP');
		expect(update.location.pathname).toBe('/logs');
		expect(nav.getCurrentLocation().pathname).toBe('/logs');
	});
});

describe('hasInAppHistory', () => {
	it('is false before any in-app push', () => {
		const nav = loadNavigation();
		expect(nav.hasInAppHistory()).toBe(false);
	});

	it('is false after a replace', () => {
		const nav = loadNavigation();
		nav.navigate('/logs', { replace: true });
		expect(nav.hasInAppHistory()).toBe(false);
	});

	it('is true after a push', () => {
		const nav = loadNavigation();
		nav.navigate('/logs');
		expect(nav.hasInAppHistory()).toBe(true);
	});
});

describe('blockNavigation', () => {
	it('hands the blocker a transition and cancels the navigation', () => {
		const nav = loadNavigation();
		const seen: BlockedTransition[] = [];
		const unblock = nav.blockNavigation((tx) => seen.push(tx));

		nav.navigate('/logs');

		expect(seen).toHaveLength(1);
		expect(seen[0].action).toBe('PUSH');
		expect(seen[0].location.pathname).toBe('/logs');
		expect(typeof seen[0].retry).toBe('function');
		expect(nav.getCurrentLocation().pathname).toBe('/');
		unblock();
	});

	it('completes the navigation when retry runs after unblocking', () => {
		const nav = loadNavigation();
		const seen: BlockedTransition[] = [];
		const unblock = nav.blockNavigation((tx) => seen.push(tx));

		nav.navigate('/logs');
		unblock();
		seen[0].retry();

		expect(nav.getCurrentLocation().pathname).toBe('/logs');
	});

	it('blocks again when retry runs while still blocked, as history@5 does', () => {
		const nav = loadNavigation();
		const seen: BlockedTransition[] = [];
		const unblock = nav.blockNavigation((tx) => seen.push(tx));

		nav.navigate('/logs');
		seen[0].retry();

		expect(seen).toHaveLength(2);
		expect(nav.getCurrentLocation().pathname).toBe('/');
		unblock();
	});

	it('preserves the replace action through retry', () => {
		const nav = loadNavigation();
		nav.navigate('/logs');
		const before = window.history.length;

		const seen: BlockedTransition[] = [];
		const unblock = nav.blockNavigation((tx) => seen.push(tx));
		nav.navigate('/traces', { replace: true });
		unblock();
		seen[0].retry();

		expect(seen[0].action).toBe('REPLACE');
		expect(nav.getCurrentLocation().pathname).toBe('/traces');
		expect(window.history).toHaveLength(before);
	});

	it('stops blocking after unblock', () => {
		const nav = loadNavigation();
		const listener = jest.fn();
		nav.blockNavigation(listener)();

		nav.navigate('/logs');

		expect(listener).not.toHaveBeenCalled();
		expect(nav.getCurrentLocation().pathname).toBe('/logs');
	});
});
