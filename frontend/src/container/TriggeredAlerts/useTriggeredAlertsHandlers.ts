import { useCallback } from 'react';
import logEvent from 'api/common/logEvent';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { useTableRowClick } from 'hooks/useTableRowClick';

import type { Alert } from './types';
import { getRuleId } from './utils';

interface UseTriggeredAlertsHandlersReturn {
	handleGroupByChange: (values: unknown) => void;
	handleRowClick: (alert: Alert) => void;
	handleRowClickNewTab: (alert: Alert) => void;
}

export function useTriggeredAlertsHandlers(
	setSelectedGroupBy: (groupBy: string[]) => void,
): UseTriggeredAlertsHandlersReturn {
	const { safeNavigate } = useSafeNavigate();

	const handleGroupByChange = useCallback(
		(values: unknown) => {
			if (Array.isArray(values)) {
				setSelectedGroupBy(values);
			}
		},
		[setSelectedGroupBy],
	);

	const getAlertUrl = useCallback((alert: Alert): string | null => {
		const ruleId = getRuleId(alert);
		if (!ruleId) {
			return null;
		}
		return `${ROUTES.ALERT_OVERVIEW}?${QueryParams.ruleId}=${ruleId}`;
	}, []);

	const onBeforeNavigate = useCallback((alert: Alert): void => {
		const ruleId = getRuleId(alert);
		logEvent('Alert: Triggered alert clicked', {
			ruleId,
			alertName: alert.labels?.alertname,
		});
	}, []);

	const { handleRowClick, handleRowClickNewTab } = useTableRowClick<Alert>({
		getUrl: getAlertUrl,
		onNavigate: safeNavigate,
		onBeforeNavigate,
	});

	return {
		handleGroupByChange,
		handleRowClick,
		handleRowClickNewTab,
	};
}
