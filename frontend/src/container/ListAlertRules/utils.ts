import logEvent from 'api/common/logEvent';
import type { RuletypesRuleDTO } from 'api/generated/services/sigNoz.schemas';
import { sortByColumn } from 'components/Alerts/utils';
import type { SortState } from 'components/TanStackTableView/types';
import { dataSourceForAlertType } from 'constants/alerts';

import type { AlertRule } from './types';

export const ALERT_RULES_REFRESH_INTERVAL = 30_000;

export const ALERT_ACTIONS = {
	TOGGLE: 'toggle',
	EDIT: 'edit',
	CLONE: 'clone',
	DELETE: 'delete',
} as const;

const ACTION_LABELS: Record<string, string> = {
	[ALERT_ACTIONS.TOGGLE]: 'Enable/Disable',
	[ALERT_ACTIONS.EDIT]: 'Edit',
	[ALERT_ACTIONS.CLONE]: 'Clone',
	[ALERT_ACTIONS.DELETE]: 'Delete',
};

export const alertActionLogEvent = (
	action: string,
	record: RuletypesRuleDTO,
): void => {
	const actionValue = ACTION_LABELS[action] ?? action;
	void logEvent('Alert: Action', {
		ruleId: record.id,
		dataSource: dataSourceForAlertType(record.alertType),
		name: record.alert,
		action: actionValue,
	});
};

export function getAlertSortValue(
	rule: AlertRule,
	columnName: string,
): string | number {
	switch (columnName) {
		case 'state':
			return rule.state ?? '';
		case 'name':
			return rule.alert ?? '';
		case 'severity':
			return rule.labels?.severity ?? '';
		case 'createdAt':
			return rule.createdAt ? new Date(rule.createdAt).getTime() : 0;
		case 'updatedAt':
			return rule.updatedAt ? new Date(rule.updatedAt).getTime() : 0;
		default:
			return '';
	}
}

export function sortRules(
	rules: AlertRule[],
	orderBy: SortState | null,
): AlertRule[] {
	return sortByColumn(rules, orderBy, getAlertSortValue);
}

export function filterRulesByFilters(
	rules: AlertRule[],
	filters: string[],
): AlertRule[] {
	if (filters.length === 0) {
		return rules;
	}

	const stateFilters = filters
		.filter((f) => f.startsWith('state:'))
		.map((f) => f.replace('state:', '').toLowerCase());

	const severityFilters = filters
		.filter((f) => f.startsWith('severity:'))
		.map((f) => f.replace('severity:', '').toLowerCase());

	return rules.filter((rule) => {
		const state = rule.state?.toLowerCase() ?? '';
		const severity = rule.labels?.severity?.toLowerCase() ?? '';

		const matchesState =
			stateFilters.length === 0 || stateFilters.includes(state);
		const matchesSeverity =
			severityFilters.length === 0 || severityFilters.includes(severity);

		return matchesState && matchesSeverity;
	});
}
