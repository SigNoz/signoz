import logEvent from 'api/common/logEvent';
import type { RuletypesRuleDTO } from 'api/generated/services/sigNoz.schemas';
import { dataSourceForAlertType } from 'constants/alerts';
import { NEW_ALERT_SCHEMA_VERSION } from 'types/api/alerts/alertTypesV2';

// v1 alerts encode severity in `labels.severity`. v2 alerts (schema v2alpha1)
// instead encode it in `condition.thresholds.spec[].name` — one entry per
// threshold. Read v1 directly; for v2, join threshold names so multi-threshold
// alerts (e.g. "warning, critical") still surface a meaningful value.
export const getAlertSeverity = (
	alert: RuletypesRuleDTO | undefined,
): string | undefined => {
	if (!alert) return undefined;

	if (alert.labels?.severity) {
		return alert.labels.severity;
	}

	if (alert.schemaVersion === NEW_ALERT_SCHEMA_VERSION) {
		const spec = alert.condition?.thresholds?.spec;
		if (Array.isArray(spec)) {
			const names = spec.map((t) => t.name).filter(Boolean);
			if (names.length > 0) {
				return names.join(', ');
			}
		}
	}

	return undefined;
};

export const filterAlerts = (
	allAlertRules: RuletypesRuleDTO[],
	filter: string,
): RuletypesRuleDTO[] => {
	if (!filter.trim()) {
		return allAlertRules;
	}

	const value = filter.trim().toLowerCase();
	return allAlertRules.filter((alert) => {
		const alertName = alert.alert?.toLowerCase();
		const severity = getAlertSeverity(alert)?.toLowerCase();

		// Create a string of all label keys and values for searching
		const labelSearchString = Object.entries(alert.labels || {})
			.map(([key, val]) => `${key} ${val}`)
			.join(' ')
			.toLowerCase();

		return (
			alertName?.includes(value) ||
			severity?.includes(value) ||
			labelSearchString.includes(value)
		);
	});
};

export const alertActionLogEvent = (
	action: string,
	record: RuletypesRuleDTO,
): void => {
	let actionValue = '';
	switch (action) {
		case '0':
			actionValue = 'Enable/Disable';
			break;
		case '1':
			actionValue = 'Edit';
			break;
		case '2':
			actionValue = 'Clone';
			break;
		case '3':
			actionValue = 'Delete';
			break;
		default:
			break;
	}
	logEvent('Alert: Action', {
		ruleId: record.id,
		dataSource: dataSourceForAlertType(record.alertType),
		name: record.alert,
		action: actionValue,
	});
};
