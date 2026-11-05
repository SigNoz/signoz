import { useCallback, useEffect, useRef } from 'react';
import { useQueryState } from 'nuqs';
import type { UseListViewsResult } from 'hooks/listViews/types';
import { useListViews } from 'hooks/listViews/useListViews';

import { ALERT_RULES_PARAMS } from './hooks';
import type { RuleListFilter } from './types';
import { useRuleViews } from './useRuleViews';
import { isDefaultRuleListFilter, isSameRuleListFilter } from './utils';
import { builtinRuleViewFilter, RuleBuiltinViewId } from './views';

interface UseAlertRuleViewsArgs {
	filter: RuleListFilter;
	applyFilter: (next: RuleListFilter) => void;
	userEmail: string;
}

export interface UseAlertRuleViewsResult extends UseListViewsResult<RuleListFilter> {
	customViewsLoading: boolean;
}

// A link carrying only `view=<custom id>` gets that view's filter applied once
// the views load; a link carrying its own filter params keeps them. Clearing a
// custom view's filter writes an empty `query=` so a reload keeps it cleared.
export function useAlertRuleViews({
	filter,
	applyFilter,
	userEmail,
}: UseAlertRuleViewsArgs): UseAlertRuleViewsResult {
	const api = useRuleViews();

	const builtinFilter = useCallback(
		(id: string, current: RuleListFilter): RuleListFilter | null =>
			builtinRuleViewFilter(id, current, userEmail),
		[userEmail],
	);

	const views = useListViews<RuleListFilter>({
		filter,
		applyFilter,
		isEqual: isSameRuleListFilter,
		builtinFilter,
		defaultViewId: RuleBuiltinViewId.All,
		api,
		urlParam: ALERT_RULES_PARAMS.VIEW,
	});

	const { activeView } = views;
	const [rawQuery, setRawQuery] = useQueryState(ALERT_RULES_PARAMS.QUERY);
	const startedFromViewLink = useRef(
		isDefaultRuleListFilter(filter) && rawQuery === null,
	);
	const hasResolvedLinkedView = useRef(false);

	// Declared before the restore so it skips the render that applies a linked view.
	const clearedCustomView =
		!!activeView && rawQuery === null && isDefaultRuleListFilter(filter);
	useEffect(() => {
		if (hasResolvedLinkedView.current && clearedCustomView) {
			void setRawQuery('', { clearOnDefault: false, history: 'replace' });
		}
	}, [clearedCustomView, setRawQuery]);

	useEffect(() => {
		if (hasResolvedLinkedView.current || api.isLoading) {
			return;
		}
		hasResolvedLinkedView.current = true;
		if (
			activeView &&
			startedFromViewLink.current &&
			isDefaultRuleListFilter(filter)
		) {
			applyFilter(activeView.filter);
		}
	}, [api.isLoading, activeView, applyFilter, filter]);

	return { ...views, customViewsLoading: api.isLoading };
}
