import logEvent from 'api/common/logEvent';
import { ALERTS_DATA_SOURCE_MAP } from 'constants/alerts';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { GettableAlert } from 'types/api/alerts/get';

/**
 * Parses key:value pairs from the filter string, allowing optional whitespace after the colon.
 */
function parseKeyValuePairs(
	filter: string,
): { keyValuePairs: Record<string, string>; filterCopy: string } {
	// Allow optional whitespace after colon, and support more flexible values
	const keyValueRegex = /([\w-]+):\s*([^\s]+)/g;
	const keyValuePairs: Record<string, string> = {};
	let filterCopy = filter.toLowerCase();
	const matches = Array.from(filterCopy.matchAll(keyValueRegex));
	matches.forEach((match) => {
		const [, key, value] = match;
		keyValuePairs[key] = value.trim();
		filterCopy = filterCopy.replace(match[0], '');
	});
	return { keyValuePairs, filterCopy };
}

const statusMap: Record<string, string> = {
	ok: 'inactive',
	inactive: 'inactive',
	pending: 'pending',
	firing: 'firing',
	disabled: 'disabled',
};

/**
 * Returns true if the alert matches the search words and key-value pairs.
 */
function alertMatches(alert: GettableAlert, searchWords: string[]): boolean {
	const alertName = alert.alert?.toLowerCase() || '';
	const severity = alert.labels?.severity?.toLowerCase() || '';
	const status = alert.state?.toLowerCase() || '';
	const labelKeys = Object.keys(alert.labels || {})
		.filter((e) => e !== 'severity')
		.map((k) => k.toLowerCase());
	const labelValues = Object.values(alert.labels || {}).map((v) =>
		typeof v === 'string' ? v.toLowerCase() : '',
	);

	const searchable = [
		alertName,
		severity,
		status,
		...labelKeys,
		...labelValues,
	].join(' ');

	// eslint-disable-next-line sonarjs/cognitive-complexity
	return searchWords.every((word) => {
		const plainTextMatch = searchable.includes(word);

		// Check if this word is a key:value pair
		const isKeyValue = word.includes(':');
		if (isKeyValue) {
			// For key:value pairs, check if the key:value logic matches
			const [key, value] = word.split(':');
			const keyValueMatch = ((): boolean => {
				if (key === 'severity') {
					return severity === value;
				}
				if (key === 'status') {
					const mappedStatus = statusMap[value] || value;
					const labelVal =
						alert.labels && key in alert.labels ? alert.labels[key] : undefined;
					return (
						status === mappedStatus ||
						(typeof labelVal === 'string' && labelVal.toLowerCase() === value)
					);
				}
				if (alert.labels && key in alert.labels) {
					const labelVal = alert.labels[key];
					return typeof labelVal === 'string' && labelVal.toLowerCase() === value;
				}
				return false;
			})();

			// For key:value pairs, match if EITHER plain text OR key:value logic matches
			return plainTextMatch || keyValueMatch;
		}

		// For regular words, only plain text matching is required
		return plainTextMatch;
	});
}

export const filterAlerts = (
	allAlertRules: GettableAlert[],
	filter: string,
): GettableAlert[] => {
	if (!filter.trim()) return allAlertRules;

	const { keyValuePairs, filterCopy } = parseKeyValuePairs(filter);
	// Include both the remaining words AND the original key:value strings as search words
	const remainingWords = filterCopy.split(/\s+/).filter(Boolean);
	const keyValueStrings = Object.entries(keyValuePairs).map(
		([key, value]) => `${key}:${value}`,
	);
	const searchWords = [...remainingWords, ...keyValueStrings];

	return allAlertRules.filter((alert) => alertMatches(alert, searchWords));
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
