import type { History } from 'history';

import { applyNavigate, retryTransition, withState } from '../utils';

function fakeHistory(): {
	history: History;
	push: jest.Mock;
	replace: jest.Mock;
	go: jest.Mock;
} {
	const push = jest.fn();
	const replace = jest.fn();
	const go = jest.fn();
	return {
		history: { push, replace, go } as unknown as History,
		push,
		replace,
		go,
	};
}

describe('applyNavigate', () => {
	it('pushes a string target with no second argument', () => {
		const { history, push } = fakeHistory();

		applyNavigate(history, '/logs');

		expect(push).toHaveBeenCalledWith('/logs');
	});

	it('pushes an object target with no state key', () => {
		const { history, push } = fakeHistory();

		applyNavigate(history, { pathname: '/logs', search: '?a=1' });

		expect(push).toHaveBeenCalledWith({ pathname: '/logs', search: '?a=1' });
	});

	it('forwards state when there is state to forward', () => {
		const { history, push } = fakeHistory();

		applyNavigate(history, '/logs', { state: { from: '/home' } });

		expect(push).toHaveBeenCalledWith('/logs', { from: '/home' });
	});

	it('attaches state to an object target', () => {
		const { history, push } = fakeHistory();

		applyNavigate(history, { pathname: '/logs' }, { state: { from: '/home' } });

		expect(push).toHaveBeenCalledWith({ pathname: '/logs' }, { from: '/home' });
	});

	it('replaces instead of pushing', () => {
		const { history, push, replace } = fakeHistory();

		applyNavigate(history, '/logs', { replace: true });

		expect(replace).toHaveBeenCalledWith('/logs');
		expect(push).not.toHaveBeenCalled();
	});

	it('replaces with state', () => {
		const { history, replace } = fakeHistory();

		applyNavigate(history, '/logs', { replace: true, state: { a: 1 } });

		expect(replace).toHaveBeenCalledWith('/logs', { a: 1 });
	});
});

describe('retryTransition', () => {
	const location = { pathname: '/logs', search: '', hash: '', state: undefined };

	it('walks a blocked POP by its distance', () => {
		const { history, go } = fakeHistory();

		retryTransition(history, location, 'POP', 2);

		expect(go).toHaveBeenCalledWith(2);
	});

	it('does not reload when a blocked POP has no distance', () => {
		const { history, go } = fakeHistory();

		retryTransition(history, location, 'POP', 0);

		expect(go).not.toHaveBeenCalled();
	});

	it('settles on the carried location when a blocked POP has an unknown distance', () => {
		const { history, go, replace } = fakeHistory();

		retryTransition(history, location, 'POP', null);

		expect(go).not.toHaveBeenCalled();
		expect(replace).toHaveBeenCalledWith(location);
	});

	it('replays PUSH and REPLACE from the carried location', () => {
		const { history, push, replace } = fakeHistory();

		retryTransition(history, location, 'PUSH', 0);
		retryTransition(history, location, 'REPLACE', 0);

		expect(push).toHaveBeenCalledWith(location);
		expect(replace).toHaveBeenCalledWith(location);
	});
});

describe('withState', () => {
	it('returns the target untouched when there is no state', () => {
		expect(withState('/logs?a=1', undefined)).toBe('/logs?a=1');
	});

	it('splits a string target before attaching state', () => {
		expect(withState('/logs?a=1#top', { from: '/home' })).toStrictEqual({
			pathname: '/logs',
			search: '?a=1',
			hash: '#top',
			state: { from: '/home' },
		});
	});

	it('resolves a search-only string against the current location', () => {
		expect(
			withState(
				'?tab=2',
				{ from: '/home' },
				{ pathname: '/x/y', search: '?q=1', hash: '', state: null },
			),
		).toMatchObject({
			pathname: '/x/y',
			search: '?tab=2',
			state: { from: '/home' },
		});
	});

	it('attaches state to an object target', () => {
		expect(withState({ pathname: '/logs' }, { from: '/home' })).toStrictEqual({
			pathname: '/logs',
			state: { from: '/home' },
		});
	});
});
