import { useEffect, useRef } from 'react';
import { useQueryState } from 'nuqs';
import type { UseListViewsResult } from 'hooks/listViews/types';
import { useListViews } from 'hooks/listViews/useListViews';

import { ALERT_RULES_PARAMS } from './hooks';
import { DEFAULT_RULE_VIEW, RULE_BUILTIN_VIEWS } from './list.config';
import type { RuleListFilter, RuleViewCtx } from './types';
import { useRuleViewCtx } from './useRuleViewCtx';
import { useRuleViews } from './useRuleViews';
import { isDefaultRuleListFilter, isSameRuleListFilter } from './utils';

interface UseAlertRuleViewsArgs {
	filter: RuleListFilter;
	applyFilter: (next: RuleListFilter) => void;
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
}: UseAlertRuleViewsArgs): UseAlertRuleViewsResult {
	const api = useRuleViews();

	const ctx = useRuleViewCtx();

	const views = useListViews<RuleListFilter, RuleViewCtx>({
		filter,
		applyFilter,
		isEqual: isSameRuleListFilter,
		builtinViews: RULE_BUILTIN_VIEWS,
		ctx,
		defaultViewId: DEFAULT_RULE_VIEW,
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
