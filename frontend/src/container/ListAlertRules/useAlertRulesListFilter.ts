import { useCallback, useMemo } from 'react';
import type { SortState } from 'components/TanStackTableView/types';

import { useAlertRulesQuery, useAlertRulesStates } from './hooks';
import type { RuleListFilter } from './types';
import { toListSort, toOrderBy } from './utils';

interface UseAlertRulesListFilterArgs {
	orderBy: SortState | null;
	setOrderBy: (orderBy: SortState | null) => void;
	setPage: (page: number) => void;
}

interface UseAlertRulesListFilterResult {
	filter: RuleListFilter;
	applyFilter: (filter: RuleListFilter) => void;
	submitQuery: (query: string) => void;
	changeStates: (states: string[]) => void;
}

// The v3 list filter, read from and written to the URL. Every change goes back to page 1.
export function useAlertRulesListFilter({
	orderBy,
	setOrderBy,
	setPage,
}: UseAlertRulesListFilterArgs): UseAlertRulesListFilterResult {
	const [query, setQuery] = useAlertRulesQuery();
	const [states, setStates] = useAlertRulesStates();

	const filter = useMemo<RuleListFilter>(
		() => ({ query, states, ...toListSort(orderBy) }),
		[query, states, orderBy],
	);

	const applyFilter = useCallback(
		(next: RuleListFilter): void => {
			void setQuery(next.query || null);
			void setStates(next.states.length ? next.states : null);
			setOrderBy(toOrderBy(next.sort, next.order));
			setPage(1);
		},
		[setQuery, setStates, setOrderBy, setPage],
	);

	const submitQuery = useCallback(
		(next: string): void => {
			void setQuery(next || null);
			setPage(1);
		},
		[setQuery, setPage],
	);

	const changeStates = useCallback(
		(next: string[]): void => {
			void setStates(next.length ? next : null);
			setPage(1);
		},
		[setStates, setPage],
	);

	return { filter, applyFilter, submitQuery, changeStates };
}
