import { act, renderHook } from '@testing-library/react';
import { getCurrentLocation, navigate } from 'lib/router/navigation';

import { useNavigationBlocker } from '../useNavigationBlocker';

function settle(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, 60);
	});
}

describe('useNavigationBlocker against the real history', () => {
	beforeEach(async () => {
		navigate('/start');
		navigate('/a');
		navigate('/b');
		navigate('/c');
		await settle();
	});

	it('lets a bypassed browser Back through without showing the modal', async () => {
		const { result } = renderHook(() => useNavigationBlocker(true));

		act(() => result.current.allowNextNavigation());
		act(() => window.history.back());
		await settle();

		expect(getCurrentLocation().pathname).toBe('/b');
		expect(result.current.isBlocked).toBe(false);
	});

	it('keeps blocking after a bypassed navigation', async () => {
		const { result } = renderHook(() => useNavigationBlocker(true));

		act(() => result.current.allowNextNavigation());
		act(() => window.history.back());
		await settle();
		act(() => navigate('/elsewhere'));

		expect(getCurrentLocation().pathname).toBe('/b');
		expect(result.current.isBlocked).toBe(true);
	});

	it('replays a blocked Forward on confirm', async () => {
		act(() => window.history.go(-2));
		await settle();
		const { result } = renderHook(() => useNavigationBlocker(true));

		act(() => window.history.forward());
		await settle();

		expect(result.current.isBlocked).toBe(true);
		expect(getCurrentLocation().pathname).toBe('/a');

		act(() => result.current.confirmNavigation());
		await settle();

		expect(getCurrentLocation().pathname).toBe('/b');
	});

	it('replays a blocked multi-entry jump on confirm', async () => {
		act(() => window.history.go(-2));
		await settle();
		const { result } = renderHook(() => useNavigationBlocker(true));

		act(() => window.history.go(2));
		await settle();
		act(() => result.current.confirmNavigation());
		await settle();

		expect(getCurrentLocation().pathname).toBe('/c');
	});
});
