import { act, renderHook } from '@testing-library/react';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { useMemoryCompositeQueryStore } from '../useMemoryCompositeQueryStore';

const legacyLogsQuery: Query = {
	...initialQueriesMap.logs,
	builder: {
		...initialQueriesMap.logs.builder,
		queryData: [
			{
				...initialQueriesMap.logs.builder.queryData[0],
				having: [{ columnName: 'count()', op: '>', value: 100 }],
			},
		],
	},
};

describe('useMemoryCompositeQueryStore', () => {
	it('starts empty when no initialQuery is provided', () => {
		const { result } = renderHook(() => useMemoryCompositeQueryStore({}));

		expect(result.current.mode).toBe('memory');
		expect(result.current.query).toBeNull();
		expect(result.current.panelType).toBeNull();
	});

	it('seeds query (with legacy-format migration) and panelType', () => {
		const { result } = renderHook(() =>
			useMemoryCompositeQueryStore({
				initialQuery: legacyLogsQuery,
				initialPanelType: PANEL_TYPES.TABLE,
			}),
		);

		expect(result.current.query?.id).toBe(legacyLogsQuery.id);
		expect(result.current.query?.builder.queryData[0].having).toStrictEqual({
			expression: 'count() > 100',
		});
		expect(result.current.panelType).toBe(PANEL_TYPES.TABLE);
	});

	it('updates query and notifies onCommit when a query is committed', () => {
		const onCommit = jest.fn();
		const { result } = renderHook(() =>
			useMemoryCompositeQueryStore({ onCommit }),
		);

		act(() => {
			result.current.commit(initialQueriesMap.logs);
		});

		expect(result.current.query).toBe(initialQueriesMap.logs);
		expect(onCommit).toHaveBeenCalledTimes(1);
		expect(onCommit).toHaveBeenCalledWith(initialQueriesMap.logs);
	});

	it('ignores URL-mode commit options but still stores the query', () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
		const { result } = renderHook(() => useMemoryCompositeQueryStore({}));

		act(() => {
			result.current.commit(initialQueriesMap.logs, {
				redirectingUrl: '/traces-explorer' as never,
				newTab: true,
			});
		});

		expect(result.current.query).toBe(initialQueriesMap.logs);
		expect(warnSpy).toHaveBeenCalled();
		warnSpy.mockRestore();
	});
});
