import { renderHook } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { AllTheProviders } from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { useLogsData } from '../useLogsData';

const mockQueryRange = jest.fn();
jest.mock('hooks/queryBuilder/useGetExplorerQueryRange', () => ({
	useGetExplorerQueryRange: (...args: unknown[]): unknown =>
		mockQueryRange(...args),
}));

beforeEach(() => {
	mockQueryRange.mockReset();
	mockQueryRange.mockReturnValue({ data: undefined, isFetching: false });
});

describe('useLogsData', () => {
	// Public dashboards redact the widget query (orderBy/filter/limit stripped),
	// so a LIST query can arrive with no orderBy — the hook must not crash on it.
	it('does not crash when the query has no orderBy', () => {
		const stagedQuery = {
			builder: {
				queryData: [{ dataSource: 'logs', queryName: 'A', disabled: false }],
			},
		} as unknown as Query;

		const { result } = renderHook(
			() =>
				useLogsData({
					result: undefined,
					panelType: PANEL_TYPES.LIST,
					stagedQuery,
				}),
			{ wrapper: AllTheProviders },
		);

		expect(result.current.logs).toStrictEqual([]);
	});

	// Pages must accumulate. useGetExplorerQueryRange hands the hook one page at a
	// time, and the effect appends each page to what is already in state, so a
	// second page must not replace the first.
	it('appends each page instead of replacing the previous one', () => {
		const page = (id: string): unknown => ({
			payload: {
				data: {
					newResult: {
						data: {
							result: [{ list: [{ timestamp: id, data: { id } }] }],
						},
					},
				},
			},
		});

		mockQueryRange.mockReturnValue({ data: page('one'), isFetching: false });

		const stagedQuery = {
			builder: {
				queryData: [{ dataSource: 'logs', queryName: 'A', disabled: false }],
			},
		} as unknown as Query;

		const { result, rerender } = renderHook(
			() =>
				useLogsData({
					result: undefined,
					panelType: PANEL_TYPES.LIST,
					stagedQuery,
				}),
			{ wrapper: AllTheProviders },
		);

		expect(result.current.logs.map((log) => log.id)).toStrictEqual(['one']);

		mockQueryRange.mockReturnValue({ data: page('two'), isFetching: false });
		rerender();

		expect(result.current.logs.map((log) => log.id)).toStrictEqual([
			'one',
			'two',
		]);
	});
});
