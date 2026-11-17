import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { back, getCurrentLocation } from 'lib/router/navigation';
import { act, AllTheProviders, renderHook, waitFor } from 'tests/test-utils';

// jest.config.ts maps `hooks/useSafeNavigate` to a mock; the `.ts` path loads the real hook.
const { useSafeNavigate } = jest.requireActual<
	typeof import('hooks/useSafeNavigate')
>('hooks/useSafeNavigate.ts');

describe('useSafeNavigate', () => {
	it('adds a history entry for replace: false even when the target adds params', async () => {
		const initialSearch = `?${QueryParams.relativeTime}=15m`;
		const { result } = renderHook(() => useSafeNavigate(), {
			wrapper: ({ children }): JSX.Element => (
				<AllTheProviders initialRoute={`${ROUTES.LOGS_EXPLORER}${initialSearch}`}>
					{children}
				</AllTheProviders>
			),
		});

		act(() => {
			result.current.safeNavigate(
				`${ROUTES.LOGS_EXPLORER}?${QueryParams.startTime}=1000`,
				{ replace: false },
			);
		});
		act(() => back());

		await waitFor(() => expect(getCurrentLocation().search).toBe(initialSearch));
	});
});
