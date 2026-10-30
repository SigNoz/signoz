import { useCallback, useEffect, useRef } from 'react';
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
// the views load; a link carrying its own filter params keeps them.
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
	const startedWithDefaultFilter = useRef(isDefaultRuleListFilter(filter));
	const hasResolvedLinkedView = useRef(false);
	useEffect(() => {
		if (hasResolvedLinkedView.current || api.isLoading) {
			return;
		}
		hasResolvedLinkedView.current = true;
		if (activeView && startedWithDefaultFilter.current) {
			applyFilter(activeView.filter);
		}
	}, [api.isLoading, activeView, applyFilter]);

	return { ...views, customViewsLoading: api.isLoading };
}
