import { Alerts } from 'types/api/alerts/getTriggered';

import { Value } from './Filter';

export const FilterAlerts = (
	allAlerts: Alerts[],
	selectedFilter: Value[],
): Alerts[] => {
	// also we need to update the alerts
	// [[key,value]]

	if (selectedFilter?.length === 0 || selectedFilter === undefined) {
		return allAlerts;
	}

	const filter: string[] = [];

	// filtering the value
	selectedFilter.forEach((e) => {
		const valueKey = e.value.split(':');
		if (valueKey.length === 2) {
			filter.push(e.value);
		}
	});

	const tags = filter.map((e) => e.split(':'));
	const objectMap = new Map();

	const filteredKey = tags.reduce((acc, curr) => [...acc, curr[0]], []);
	const filteredValue = tags.reduce((acc, curr) => [...acc, curr[1]], []);

	filteredKey.forEach((key, index) =>
		objectMap.set(key.trim(), filteredValue[index].trim()),
	);

	const filteredAlerts: Set<string> = new Set();

	allAlerts.forEach((alert) => {
		const { labels } = alert;
		Object.keys(labels).forEach((e) => {
			const selectedKey = objectMap.get(e);

			// alerts which does not have the key with value
			if (selectedKey && labels[e] === selectedKey) {
				filteredAlerts.add(alert.fingerprint);
			}
		});
	});

	return allAlerts.filter((e) => filteredAlerts.has(e.fingerprint));
};
