import { GettableAlert } from 'types/api/alerts/get';

export const filterAlerts = (
	allAlertRules: GettableAlert[],
	filter: string,
): GettableAlert[] => {
	const value = filter.toLowerCase();
	return allAlertRules.filter((alert) => {
		const alertName = alert.alert.toLowerCase();
		const severity = alert.labels?.severity.toLowerCase();
		const labels = Object.keys(alert.labels || {})
			.filter((e) => e !== 'severity')
			.join(' ')
			.toLowerCase();

		const labelValue = Object.values(alert.labels || {});

		return (
			alertName.includes(value) ||
			severity?.includes(value) ||
			labels.includes(value) ||
			labelValue.includes(value)
		);
	});
};
