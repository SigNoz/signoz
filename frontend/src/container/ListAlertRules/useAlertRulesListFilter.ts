import { useCallback, useMemo } from 'react';
import type { SortState } from 'components/TanStackTableView/types';
import { useQueryState } from 'nuqs';

import {
	ALERT_RULES_PARAMS,
	useAlertRulesQuery,
	useAlertRulesStates,
} from './hooks';
import { findRuleBuiltinView } from './list.config';
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

	// Clearing a custom view's filter writes an empty `query=`, so a reload does
	// not re-apply the view.
	const [viewId] = useQueryState(ALERT_RULES_PARAMS.VIEW);
	const onCustomView = !!viewId && !findRuleBuiltinView(viewId);
	const pinEmptyQuery = useCallback((): void => {
		void setQuery('', { clearOnDefault: false });
	}, [setQuery]);

	const submitQuery = useCallback(
		(next: string): void => {
			if (!next && onCustomView) {
				pinEmptyQuery();
			} else {
				void setQuery(next || null);
			}
			setPage(1);
		},
		[onCustomView, pinEmptyQuery, setQuery, setPage],
	);

	const changeStates = useCallback(
		(next: string[]): void => {
			void setStates(next.length ? next : null);
			if (!query && onCustomView) {
				pinEmptyQuery();
			}
			setPage(1);
		},
		[setStates, query, onCustomView, pinEmptyQuery, setPage],
	);

	return { filter, applyFilter, submitQuery, changeStates };
}
