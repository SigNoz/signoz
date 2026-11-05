import { QueryParams } from 'constants/query';
import { initialQueriesMap } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { getCurrentLocation } from 'lib/router/navigation';
import {
	act,
	AllTheProviders,
	renderHook,
	RenderHookResult,
	waitFor,
} from 'tests/test-utils';
import { QueryBuilderContextType } from 'types/common/queryBuilder';

jest.mock('hooks/useSafeNavigate', () => {
	const { navigate } = jest.requireActual<
		typeof import('lib/router/navigation')
	>('lib/router/navigation');
	return {
		useSafeNavigate: (): unknown => ({
			safeNavigate: (to: string, opts?: { replace?: boolean }): void => {
				navigate(to, { replace: opts?.replace });
			},
		}),
	};
});

const currentParams = (): URLSearchParams =>
	new URLSearchParams(getCurrentLocation().search);

const renderOn = (
	url: string,
): RenderHookResult<QueryBuilderContextType, unknown> =>
	renderHook(() => useQueryBuilder(), {
		wrapper: ({ children }): JSX.Element => (
			<AllTheProviders initialRoute={url}>{children}</AllTheProviders>
		),
	});

describe('redirectWithQueryBuilderData search params', () => {
	it('removes params passed as null and JSON-encodes the rest', async () => {
		const { result } = renderOn(
			`/unconstrained?${QueryParams.relativeTime}=6h&${QueryParams.viewName}=kept`,
		);

		act(() => {
			result.current.redirectWithQueryBuilderData(initialQueriesMap.logs, {
				[QueryParams.relativeTime]: null,
				[QueryParams.startTime]: 1000,
			});
		});

		await waitFor(() =>
			expect(currentParams().get(QueryParams.startTime)).toBe('1000'),
		);
		expect(currentParams().has(QueryParams.relativeTime)).toBe(false);
		expect(currentParams().get(QueryParams.viewName)).toBe('kept');
	});
});
