import { renderHook } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';

import { QuickFiltersSource } from '../../types';
import useActiveQueryIndex from '../useActiveQueryIndex';

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));

const LAST_USED_QUERY = 2;

function mockQueryBuilder(panelType: PANEL_TYPES): void {
	(useQueryBuilder as jest.Mock).mockReturnValue({
		lastUsedQuery: LAST_USED_QUERY,
		panelType,
	});
}

describe('useActiveQueryIndex', () => {
	describe('AI observability builds a single query in the row-level views', () => {
		it.each([PANEL_TYPES.LIST, PANEL_TYPES.TRACE])(
			'drives the first query in %s',
			(panelType) => {
				mockQueryBuilder(panelType);

				const { result } = renderHook(() =>
					useActiveQueryIndex(QuickFiltersSource.AI_OBSERVABILITY),
				);

				expect(result.current).toBe(0);
			},
		);

		it.each([PANEL_TYPES.TIME_SERIES, PANEL_TYPES.TABLE])(
			'follows the last used query in %s',
			(panelType) => {
				mockQueryBuilder(panelType);

				const { result } = renderHook(() =>
					useActiveQueryIndex(QuickFiltersSource.AI_OBSERVABILITY),
				);

				expect(result.current).toBe(LAST_USED_QUERY);
			},
		);
	});

	describe('other sources are unchanged', () => {
		it('lets the traces explorer track the last used query in list view', () => {
			mockQueryBuilder(PANEL_TYPES.LIST);

			const { result } = renderHook(() =>
				useActiveQueryIndex(QuickFiltersSource.TRACES_EXPLORER),
			);

			expect(result.current).toBe(LAST_USED_QUERY);
		});

		it('pins single-query sources to the first query in list view', () => {
			mockQueryBuilder(PANEL_TYPES.LIST);

			const { result } = renderHook(() =>
				useActiveQueryIndex(QuickFiltersSource.INFRA_MONITORING),
			);

			expect(result.current).toBe(0);
		});

		it('tracks the last used query outside list view', () => {
			mockQueryBuilder(PANEL_TYPES.TIME_SERIES);

			const { result } = renderHook(() =>
				useActiveQueryIndex(QuickFiltersSource.LOGS_EXPLORER),
			);

			expect(result.current).toBe(LAST_USED_QUERY);
		});
	});
});
