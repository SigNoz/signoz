import { v4 as uuidv4 } from 'uuid';

import type { FilterValue } from 'components/Alerts/types';
import {
	filterByLabels,
	searchByLabels,
	sortByColumn,
} from 'components/Alerts/utils';
import type { SortState } from 'components/TanStackTableView/types';

import { getElapsedMs } from 'utils/timeUtils';

import type { Alert } from './types';

export function normalizeAlerts(rawAlerts: Alert[] | undefined): Alert[] {
	if (!rawAlerts) {
		return [];
	}
	return rawAlerts.map((alert) => ({
		...alert,
		fingerprint: alert.fingerprint ?? uuidv4(),
	}));
}

export function getAlertSortValue(
	alert: Alert,
	columnName: string,
): string | number {
	switch (columnName) {
		case 'status':
			return alert.status?.state ?? '';
		case 'alertName':
			return alert.labels?.alertname ?? '';
		case 'severity':
			return alert.labels?.severity ?? '';
		case 'firingSince':
			return alert.startsAt ? getElapsedMs(alert.startsAt) : '';
		case 'duration':
			return getElapsedMs(alert.startsAt);
		default:
			return '';
	}
}

export function sortAlerts(
	alerts: Alert[],
	orderBy: SortState | null,
): Alert[] {
	return sortByColumn(alerts, orderBy, getAlertSortValue, {
		columnName: 'duration',
		order: 'asc',
	});
}

export { filterByLabels as filterAlerts, searchByLabels as searchAlerts };
export type { FilterValue };

export function getRuleId(alert: Alert): string | null {
	// Primary: labels.ruleId
	if (alert.labels?.ruleId) {
		return alert.labels.ruleId;
	}

	// Fallback: parse from generatorURL
	if (alert.generatorURL) {
		try {
			const url = new URL(alert.generatorURL);
			const ruleId = url.searchParams.get('ruleId');
			if (ruleId) {
				return ruleId;
			}
		} catch {
			// Invalid URL, ignore
		}
	}

	return null;
}
