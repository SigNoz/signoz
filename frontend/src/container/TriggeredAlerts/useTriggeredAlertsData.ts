import { useEffect, useMemo, useRef } from 'react';
import logEvent from 'api/common/logEvent';
import { useGetAlerts } from 'api/generated/services/alerts';
import type { FilterValue } from 'components/Alerts/types';
import { filterByLabels, searchByLabels } from 'components/Alerts/utils';
import type { SortState } from 'components/TanStackTableView/types';
import { groupBy as lodashGroupBy, isUndefined } from 'lodash-es';

import type { Alert, GroupedAlert } from './types';
import { normalizeAlerts, sortAlerts } from './utils';

interface UseTriggeredAlertsDataReturn {
	allAlerts: Alert[];
	filteredAlerts: Alert[];
	groupedData: GroupedAlert[];
	uniqueLabels: string[];
	isFetching: boolean;
	isError: boolean;
	isGrouped: boolean;
	refetch: () => void;
}

const TRIGGERED_ALERTS_REFRESH_INTERVAL = 30_000;

export function useTriggeredAlertsData(
	selectedFilter: FilterValue[],
	selectedGroupBy: string[],
	orderBy: SortState | null,
	searchText = '',
): UseTriggeredAlertsDataReturn {
	const hasLoggedEvent = useRef(false);

	const alertsResponse = useGetAlerts({
		query: {
			refetchInterval: TRIGGERED_ALERTS_REFRESH_INTERVAL,
		},
	});

	useEffect(() => {
		const alerts = alertsResponse.data?.data;
		if (!hasLoggedEvent.current && !isUndefined(alerts)) {
			logEvent('Alert: Triggered alert list page visited', {
				number: alerts?.length,
			});
			hasLoggedEvent.current = true;
		}
	}, [alertsResponse.data]);

	const allAlerts = useMemo(
		() => normalizeAlerts(alertsResponse.data?.data),
		[alertsResponse.data],
	);

	const filteredAlerts = useMemo(() => {
		let result = filterByLabels(allAlerts, selectedFilter);
		result = searchByLabels(result, searchText, (a) => a.labels?.alertname ?? '');
		return sortAlerts(result, orderBy);
	}, [allAlerts, selectedFilter, searchText, orderBy]);

	const uniqueLabels = useMemo(() => {
		const labelsSet = new Set<string>();
		allAlerts.forEach((alert) => {
			if (alert.labels) {
				Object.keys(alert.labels).forEach((key) => labelsSet.add(key));
			}
		});
		return Array.from(labelsSet);
	}, [allAlerts]);

	const groupedData = useMemo((): GroupedAlert[] => {
		if (!selectedGroupBy.length) {
			return [];
		}

		const grouped = lodashGroupBy(filteredAlerts, (alert) =>
			selectedGroupBy.map((key) => alert.labels?.[key] ?? '').join('+'),
		);

		return Object.entries(grouped)
			.filter(([, alerts]) => alerts.length > 0)
			.map(([groupKey, alerts]) => {
				const firstAlert = alerts[0];
				const groupLabels: Record<string, string> = {};
				selectedGroupBy.forEach((key) => {
					groupLabels[key] = firstAlert.labels?.[key] ?? '';
				});

				return {
					groupKey,
					groupLabels,
					alerts,
					firstAlert,
				};
			});
	}, [filteredAlerts, selectedGroupBy]);

	return {
		allAlerts,
		filteredAlerts,
		groupedData,
		uniqueLabels,
		isFetching: alertsResponse.isFetching,
		isError: alertsResponse.isError,
		isGrouped: selectedGroupBy.length > 0,
		refetch: alertsResponse.refetch,
	};
}
