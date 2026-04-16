import logEvent from 'api/common/logEvent';
import type { RuletypesGettableRuleDTO } from 'api/generated/services/sigNoz.schemas';
import { ALERTS_DATA_SOURCE_MAP } from 'constants/alerts';
import { AlertTypes } from 'types/api/alerts/alertTypes';

export const filterAlerts = (
	allAlertRules: RuletypesGettableRuleDTO[],
	filter: string,
): RuletypesGettableRuleDTO[] => {
	if (!filter.trim()) {
		return allAlertRules;
	}

	const value = filter.trim().toLowerCase();
	return allAlertRules.filter((alert) => {
		const alertName = alert.alert?.toLowerCase();
		const severity = alert.labels?.severity?.toLowerCase();

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
	record: RuletypesGettableRuleDTO,
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
		ruleId: record?.id,
		dataSource: ALERTS_DATA_SOURCE_MAP[record.alertType as AlertTypes],
		name: record?.alert,
		action: actionValue,
	});
};
