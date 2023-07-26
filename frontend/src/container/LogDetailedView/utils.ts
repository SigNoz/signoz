import { fieldSearchFilter } from 'lib/logs/fieldSearch';
import { useMemo } from 'react';
import { ILog } from 'types/api/logs/log';

export const recursiveParseJSON = (obj: string): Record<string, unknown> => {
	try {
		const value = JSON.parse(obj);
		if (typeof value === 'string') {
			return recursiveParseJSON(value);
		}
		if (typeof value === 'object') {
			Object.entries(value).forEach(([key, val]) => {
				if (typeof val === 'string') {
					value[key] = val.trim();
				} else if (typeof val === 'object') {
					value[key] = recursiveParseJSON(JSON.stringify(val));
				}
			});
		}
		return value;
	} catch (e) {
		return {};
	}
};

type AnyObject = { [key: string]: any };

export function flattenObject(obj: AnyObject, prefix = ''): AnyObject {
	return Object.keys(obj).reduce((acc: AnyObject, k: string): AnyObject => {
		const pre = prefix.length ? `${prefix}.` : '';
		if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
			Object.assign(acc, flattenObject(obj[k], pre + k));
		} else {
			acc[pre + k] = obj[k];
		}
		return acc;
	}, {});
}

type UseLogDataReturnType = {
	sortDataByField: (searchInput: string) => SortDataByFieldReturnType;
	flattenLogData: AnyObject | null;
};

type SortDataByFieldReturnType =
	| { key: string; field: string; value: string }[]
	| null;

export function useLogData(logData: ILog): UseLogDataReturnType {
	const flattenLogData = useMemo(
		() => (logData ? flattenObject(logData) : null),
		[logData],
	);

	function sortDataByField(searchInput: string): SortDataByFieldReturnType {
		if (flattenLogData === null) {
			return null;
		}

		return Object.keys(flattenLogData)
			.filter((field) => fieldSearchFilter(field, searchInput))
			.sort((a, b) => {
				if (a === 'timestamp') return -1;
				if (b === 'timestamp') return 1;
				if (a === 'id') return -1;
				if (b === 'id') return 1;
				return 0;
			})
			.map((key) => ({
				key,
				field: key,
				value: JSON.stringify(flattenLogData[key]),
			}));
	}

	return { sortDataByField, flattenLogData };
}
