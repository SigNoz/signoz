import { MetricsType } from 'container/MetricsApplication/constant';

import { IFieldAttributes } from './LogDetailedView.types';

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

export const getFieldAttributes = (field: string): IFieldAttributes => {
	let dataType;
	let newField;
	let logType;

	if (field.startsWith('attributes_')) {
		logType = MetricsType.Tag;
		const stringWithoutPrefix = field.slice('attributes_'.length);
		const parts = stringWithoutPrefix.split('.');
		[dataType, newField] = parts;
	} else if (field.startsWith('resources_')) {
		logType = MetricsType.Resource;
		const stringWithoutPrefix = field.slice('resources_'.length);
		const parts = stringWithoutPrefix.split('.');
		[dataType, newField] = parts;
	}

	return { dataType, newField, logType };
};
