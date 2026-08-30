import { act, renderHook } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { AllTheProviders } from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { ListItem, QueryDataV3 } from 'types/api/widgets/getQuery';

import { useGetExplorerQueryRange } from '../queryBuilder/useGetExplorerQueryRange';
import { useLogsData } from '../useLogsData';

jest.mock('../queryBuilder/useGetExplorerQueryRange', () => ({
	useGetExplorerQueryRange: jest.fn(),
}));

const mockedUseGetExplorerQueryRange = jest.mocked(useGetExplorerQueryRange);

const createLogResult = (id: string): QueryDataV3[] => [
	{
		list: [
			{
				timestamp: id,
				data: { id } as ListItem['data'],
			},
		],
		queryName: 'A',
		series: null,
	},
];

const createPageResponse = (id: string) => ({
	payload: {
		data: {
			newResult: {
				data: {
					result: createLogResult(id),
					resultType: 'matrix',
				},
			},
		},
	},
});

describe('useLogsData', () => {
	beforeEach(() => {
		mockedUseGetExplorerQueryRange.mockReturnValue({
			data: undefined,
			isFetching: false,
		} as ReturnType<typeof useGetExplorerQueryRange>);
	});

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

	it('appends fetched log pages', async () => {
		let response: ReturnType<typeof createPageResponse> | undefined;
		mockedUseGetExplorerQueryRange.mockImplementation(
			() =>
				({
					data: response,
					isFetching: false,
				} as ReturnType<typeof useGetExplorerQueryRange>),
		);

		const stagedQuery = {
			builder: {
				queryData: [{ dataSource: 'logs', queryName: 'A', disabled: false }],
			},
		} as unknown as Query;
		const firstPage = createLogResult('page-1');

		const { result, rerender } = renderHook(
			() =>
				useLogsData({
					result: firstPage,
					panelType: PANEL_TYPES.LIST,
					stagedQuery,
				}),
			{ wrapper: AllTheProviders },
		);

		await act(async () => {
			response = createPageResponse('page-2');
			rerender();
		});

		expect(result.current.logs.map((log) => log.id)).toStrictEqual([
			'page-1',
			'page-2',
		]);

		await act(async () => {
			response = createPageResponse('page-3');
			rerender();
		});

		expect(result.current.logs.map((log) => log.id)).toStrictEqual([
			'page-1',
			'page-2',
			'page-3',
		]);
	});
});
