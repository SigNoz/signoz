import { safeNavigateMock } from '__tests__/safeNavigateMock';
import { QueryParams } from 'constants/query';
import { initialQueriesMap } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { act, AllTheProviders, renderHook } from 'tests/test-utils';

describe('redirectWithQueryBuilderData search params', () => {
	it('removes params passed as null and JSON-encodes the rest', () => {
		const { result } = renderHook(() => useQueryBuilder(), {
			wrapper: ({ children }): JSX.Element => (
				<AllTheProviders
					initialRoute={`/unconstrained?${QueryParams.relativeTime}=6h&${QueryParams.viewName}=kept`}
				>
					{children}
				</AllTheProviders>
			),
		});

		act(() => {
			result.current.redirectWithQueryBuilderData(initialQueriesMap.logs, {
				[QueryParams.relativeTime]: null,
				[QueryParams.startTime]: 1000,
			});
		});

		const [url] = safeNavigateMock.mock.lastCall ?? [];
		expect(url).toContain(`${QueryParams.startTime}=1000`);
		expect(url).not.toContain(`${QueryParams.relativeTime}=`);
		expect(url).toContain(`${QueryParams.viewName}=kept`);
	});
});
