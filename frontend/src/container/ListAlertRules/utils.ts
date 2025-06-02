import logEvent from 'api/common/logEvent';
import { ALERTS_DATA_SOURCE_MAP } from 'constants/alerts';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { GettableAlert } from 'types/api/alerts/get';

export const filterAlerts = (
	allAlertRules: GettableAlert[],
	filter: string,
): GettableAlert[] => {
	if (!filter.trim()) return allAlertRules;

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
	record: GettableAlert,
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
