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
function alertMatches(
	alert: GettableAlert,
	searchWords: string[],
	keyValuePairs: Record<string, string>,
): boolean {
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

	const allWordsMatch = searchWords.every((word) => searchable.includes(word));

	const allKeyValueMatch = Object.entries(keyValuePairs).every(
		([key, value]) => {
			if (key === 'severity') {
				return severity === value;
			}
			if (key === 'status') {
				const mappedStatus = statusMap[value] || value;
				return status === mappedStatus;
			}
			if (alert.labels && key in alert.labels) {
				return String(alert.labels[key]).toLowerCase() === value;
			}
			return false;
		},
	);

	return allWordsMatch && allKeyValueMatch;
}

export const filterAlerts = (
	allAlertRules: GettableAlert[],
	filter: string,
): GettableAlert[] => {
	if (!filter.trim()) return allAlertRules;

	const { keyValuePairs, filterCopy } = parseKeyValuePairs(filter);
	const searchWords = filterCopy.split(/\s+/).filter(Boolean);

	return allAlertRules.filter((alert) =>
		alertMatches(alert, searchWords, keyValuePairs),
	);
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
