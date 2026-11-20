import { useCallback } from 'react';
import logEvent from 'api/common/logEvent';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { useTableRowClick } from 'hooks/useTableRowClick';
import useUrlQuery from 'hooks/useUrlQuery';
import { isModifierKeyPressed } from 'utils/app';

import type { AlertRule } from './types';
import { useAlertRuleViewsStore } from './useAlertRuleViewsStore';

interface UseAlertRulesHandlersReturn {
	handleEdit: (
		rule: Pick<AlertRule, 'id'>,
		options?: { newTab?: boolean },
	) => void;
	handleNewAlert: (e: React.MouseEvent) => void;
	handleRowClick: (rule: AlertRule) => void;
	handleRowClickNewTab: (rule: AlertRule) => void;
}

export function useAlertRulesHandlers(
	allRulesCount: number,
): UseAlertRulesHandlersReturn {
	const { safeNavigate } = useSafeNavigate();
	const params = useUrlQuery();
	const markViewed = useAlertRuleViewsStore((s) => s.markViewed);

	const markRuleViewed = useCallback(
		(rule: Pick<AlertRule, 'id'>): void => {
			if (rule.id) {
				markViewed(rule.id);
			}
		},
		[markViewed],
	);

	const getEditUrl = useCallback(
		(rule: Pick<AlertRule, 'id'>): string => {
			const editParams = new URLSearchParams(params);
			editParams.set(QueryParams.ruleId, rule.id);
			return `${ROUTES.ALERT_OVERVIEW}?${editParams.toString()}`;
		},
		[params],
	);

	const handleEdit = useCallback(
		(rule: Pick<AlertRule, 'id'>, options?: { newTab?: boolean }): void => {
			markRuleViewed(rule);
			safeNavigate(getEditUrl(rule), options);
		},
		[getEditUrl, safeNavigate, markRuleViewed],
	);

	const handleNewAlert = useCallback(
		(e: React.MouseEvent): void => {
			void logEvent('Alert: New alert button clicked', {
				number: allRulesCount,
				layout: 'new',
			});
			safeNavigate(ROUTES.ALERTS_NEW, {
				newTab: isModifierKeyPressed(e),
			});
		},
		[allRulesCount, safeNavigate],
	);

	const { handleRowClick, handleRowClickNewTab } = useTableRowClick<AlertRule>({
		getUrl: getEditUrl,
		onNavigate: safeNavigate,
		onBeforeNavigate: markRuleViewed,
	});

	return {
		handleEdit,
		handleNewAlert,
		handleRowClick,
		handleRowClickNewTab,
	};
}
