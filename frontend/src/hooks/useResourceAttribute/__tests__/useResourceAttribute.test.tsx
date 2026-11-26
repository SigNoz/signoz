import { QueryClient, QueryClientProvider } from 'react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { getCurrentLocation } from 'lib/router/navigation';
import { AppProvider } from 'providers/App/App';
import { TestRouter } from 'tests/router';

import ResourceProvider from '../ResourceProvider';
import useResourceAttribute from '../useResourceAttribute';

const queryClient = new QueryClient();

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

describe('useResourceAttribute component hook', () => {
	it('should not change other query params except for resourceAttribute', async () => {
		const wrapper = ({ children }: { children: any }): JSX.Element => (
			<QueryClientProvider client={queryClient}>
				<AppProvider>
					<TestRouter initialRoute="/inital-url?tab=overview">
						<ResourceProvider>{children}</ResourceProvider>
					</TestRouter>
				</AppProvider>
			</QueryClientProvider>
		);
		const { result } = renderHook(() => useResourceAttribute(), { wrapper });

		act(() => {
			result.current.handleEnvironmentChange(['production']);
		});

		await waitFor(() =>
			expect(getCurrentLocation().search).toContain('tab=overview'),
		);
	});
});
