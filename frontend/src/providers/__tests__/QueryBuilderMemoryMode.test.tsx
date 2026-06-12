import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, renderHook } from '@testing-library/react';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryBuilderContextType } from 'types/common/queryBuilder';

import { QueryBuilderProvider } from '../QueryBuilder';

const mockSafeNavigate = jest.fn();

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

const mockOnStagedQueryChange = jest.fn();

function createMemoryModeWrapper(
	initialQuery?: Query,
): ({ children }: { children: React.ReactNode }) => JSX.Element {
	return function Wrapper({
		children,
	}: {
		children: React.ReactNode;
	}): JSX.Element {
		return (
			<MemoryRouter initialEntries={['/dashboard/test-dashboard']}>
				<QueryBuilderProvider
					mode="memory"
					initialQuery={initialQuery}
					initialPanelType={PANEL_TYPES.TABLE}
					onStagedQueryChange={mockOnStagedQueryChange}
				>
					{children}
				</QueryBuilderProvider>
			</MemoryRouter>
		);
	};
}

describe('QueryBuilderProvider in memory mode', () => {
	beforeEach(() => {
		mockSafeNavigate.mockClear();
		mockOnStagedQueryChange.mockClear();
	});

	it('exposes memory mode and seeds staged/current query from initialQuery', () => {
		const { result } = renderHook(() => useQueryBuilder(), {
			wrapper: createMemoryModeWrapper(initialQueriesMap.logs),
		});

		expect(result.current.mode).toBe('memory');
		expect(result.current.panelType).toBe(PANEL_TYPES.TABLE);
		expect(result.current.stagedQuery?.id).toBe(initialQueriesMap.logs.id);
		expect(result.current.currentQuery.builder.queryData[0].dataSource).toBe(
			initialQueriesMap.logs.builder.queryData[0].dataSource,
		);
		expect(mockSafeNavigate).not.toHaveBeenCalled();
		expect(mockOnStagedQueryChange).not.toHaveBeenCalled();
	});

	it('stages on handleRunQuery without navigating and notifies the host', () => {
		const { result } = renderHook(() => useQueryBuilder(), {
			wrapper: createMemoryModeWrapper(initialQueriesMap.logs),
		});

		const seededStagedQueryId = result.current.stagedQuery?.id;

		act(() => {
			result.current.handleRunQuery();
		});

		expect(mockSafeNavigate).not.toHaveBeenCalled();
		expect(mockOnStagedQueryChange).toHaveBeenCalledTimes(1);

		const stagedByHost = mockOnStagedQueryChange.mock.calls[0][0];
		expect(stagedByHost.builder.queryData[0].dataSource).toBe(
			initialQueriesMap.logs.builder.queryData[0].dataSource,
		);

		expect(result.current.stagedQuery?.id).toBe(stagedByHost.id);
		expect(result.current.stagedQuery?.id).not.toBe(seededStagedQueryId);
	});

	it('useShareBuilderUrl seeds the default query in memory without navigating', () => {
		const { result } = renderHook(
			(): QueryBuilderContextType => {
				useShareBuilderUrl({ defaultValue: initialQueriesMap.traces });
				return useQueryBuilder();
			},
			{ wrapper: createMemoryModeWrapper() },
		);

		expect(mockSafeNavigate).not.toHaveBeenCalled();
		expect(result.current.committedQuery).not.toBeNull();
		expect(result.current.stagedQuery?.builder.queryData[0].dataSource).toBe(
			initialQueriesMap.traces.builder.queryData[0].dataSource,
		);
	});

	it('useShareBuilderUrl does not clobber a seeded initialQuery', () => {
		const { result } = renderHook(
			(): QueryBuilderContextType => {
				useShareBuilderUrl({ defaultValue: initialQueriesMap.traces });
				return useQueryBuilder();
			},
			{ wrapper: createMemoryModeWrapper(initialQueriesMap.logs) },
		);

		expect(mockSafeNavigate).not.toHaveBeenCalled();
		expect(result.current.stagedQuery?.builder.queryData[0].dataSource).toBe(
			initialQueriesMap.logs.builder.queryData[0].dataSource,
		);
	});

	it('redirectWithQueryBuilderData commits in memory without navigating', () => {
		const { result } = renderHook(() => useQueryBuilder(), {
			wrapper: createMemoryModeWrapper(initialQueriesMap.logs),
		});

		act(() => {
			result.current.redirectWithQueryBuilderData(initialQueriesMap.traces);
		});

		expect(mockSafeNavigate).not.toHaveBeenCalled();
		expect(mockOnStagedQueryChange).toHaveBeenCalledTimes(1);
		expect(result.current.stagedQuery?.builder.queryData[0].dataSource).toBe(
			initialQueriesMap.traces.builder.queryData[0].dataSource,
		);
	});
});
