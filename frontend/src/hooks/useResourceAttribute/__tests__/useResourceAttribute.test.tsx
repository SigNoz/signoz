import { act, renderHook, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';

import ResourceProvider from '../ResourceProvider';
import useResourceAttribute from '../useResourceAttribute';

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

describe('useResourceAttribute component hook', () => {
	it('should not change other query params except for resourceAttribute', async () => {
		const history = createMemoryHistory({
			initialEntries: ['/inital-url?tab=overview'],
		});
		const wrapper = ({ children }: { children: any }): JSX.Element => (
			<Router history={history}>
				<ResourceProvider>{children}</ResourceProvider>
			</Router>
		);
		const { result } = renderHook(() => useResourceAttribute(), { wrapper });

		act(() => {
			result.current.handleEnvironmentChange(['production']);
		});

		await waitFor(() =>
			expect(history.location.search).toContain('tab=overview'),
		);
	});
});
