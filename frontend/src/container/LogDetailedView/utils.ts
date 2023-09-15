import { MetricsType } from 'container/MetricsApplication/constant';
import { ILog, ILogAggregateAttributesResources } from 'types/api/logs/log';

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

export const aggregateAttributesResourcesToString = (logData: ILog): string => {
	const outputJson: ILogAggregateAttributesResources = {
		body: logData.body,
		date: logData.date,
		id: logData.id,
		severityNumber: logData.severityNumber,
		severityText: logData.severityText,
		spanId: logData.spanId,
		timestamp: logData.timestamp,
		traceFlags: logData.traceFlags,
		traceId: logData.traceId,
		attributes: {},
		resources: {},
	};

	Object.keys(logData).forEach((key) => {
		if (key.startsWith('attributes_')) {
			outputJson.attributes = outputJson.attributes || {};
			Object.assign(outputJson.attributes, logData[key as keyof ILog]);
		} else if (key.startsWith('resources_')) {
			outputJson.resources = outputJson.resources || {};
			Object.assign(outputJson.resources, logData[key as keyof ILog]);
		} else {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			outputJson[key] = logData[key as keyof ILog];
		}
	});

	return JSON.stringify(outputJson, null, 2);
};
