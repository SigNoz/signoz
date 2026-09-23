import type { NavigableHistory } from '../types';
import { applyNavigate } from '../utils';

function fakeHistory(): {
	history: NavigableHistory;
	push: jest.Mock;
	replace: jest.Mock;
} {
	const push = jest.fn();
	const replace = jest.fn();
	return { history: { push, replace }, push, replace };
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

	it('attaches state to an object target as its own argument', () => {
		const { history, push } = fakeHistory();

		applyNavigate(history, { pathname: '/logs' }, { state: { from: '/home' } });

		// Not `{ pathname, state }`: history@5's `getNextLocation` overwrites a
		// `state` key inside the target with the second argument.
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
