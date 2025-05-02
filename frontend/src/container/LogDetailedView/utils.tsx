import { DataNode } from 'antd/es/tree';
import { MetricsType } from 'container/MetricsApplication/constant';
import { uniqueId } from 'lodash-es';
import { ILog, ILogAggregateAttributesResources } from 'types/api/logs/log';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import BodyTitleRenderer from './BodyTitleRenderer';
import { typeToArrayTypeMapper } from './config';
import { AnyObject, IFieldAttributes } from './LogDetailedView.types';

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

export const computeDataNode = (
	key: string,
	valueIsArray: boolean,
	value: unknown,
	nodeKey: string,
): DataNode => ({
	key: uniqueId(),
	title: `${key} ${valueIsArray ? '[...]' : ''}`,
	// eslint-disable-next-line @typescript-eslint/no-use-before-define
	children: jsonToDataNodes(
		value as Record<string, unknown>,
		valueIsArray ? `${nodeKey}[*]` : nodeKey,
		valueIsArray,
	),
});

export function jsonToDataNodes(
	json: Record<string, unknown>,
	parentKey = '',
	parentIsArray = false,
): DataNode[] {
	return Object.entries(json).map(([key, value]) => {
		let nodeKey = parentKey || key;
		if (parentIsArray) {
			nodeKey += `.${value}`;
		} else if (parentKey) {
			nodeKey += `.${key}`;
		}

		const valueIsArray = Array.isArray(value);

		if (parentIsArray) {
			if (typeof value === 'object' && value !== null) {
				return computeDataNode(key, valueIsArray, value, nodeKey);
			}

			return {
				key: uniqueId(),
				title: (
					<BodyTitleRenderer
						title={value as string}
						nodeKey={nodeKey}
						value={value}
						parentIsArray={parentIsArray}
					/>
				),
				children: jsonToDataNodes({}, nodeKey, valueIsArray),
			};
		}

		if (typeof value === 'object' && value !== null) {
			return computeDataNode(key, valueIsArray, value, nodeKey);
		}
		return {
			key: uniqueId(),
			title: (
				<BodyTitleRenderer
					title={key}
					nodeKey={nodeKey}
					value={value}
					parentIsArray={parentIsArray}
				/>
			),
		};
	});
}

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

export const generateFieldKeyForArray = (
	fieldKey: string,
	dataType: DataTypes,
): string => {
	let lastDotIndex = fieldKey.lastIndexOf('.');
	let resultNodeKey = fieldKey;
	if (lastDotIndex !== -1) {
		resultNodeKey = fieldKey.substring(0, lastDotIndex);
	}

	let newResultNodeKey = resultNodeKey;

	if (dataType === DataTypes.Float64) {
		lastDotIndex = resultNodeKey.lastIndexOf('.');
		if (lastDotIndex !== -1) {
			newResultNodeKey = resultNodeKey.substring(0, lastDotIndex);
		}
	}
	return `body.${newResultNodeKey}`;
};

export const removeObjectFromString = (str: string): string =>
	str.replace(/\[object Object\]./g, '');

// Split `str` on the first occurrence of `delimiter`
// For example, will return `['a', 'b.c']` when splitting `'a.b.c'` at dots
const splitOnce = (str: string, delimiter: string): string[] => {
	const parts = str.split(delimiter);
	if (parts.length < 2) {
		return parts;
	}
	return [parts[0], parts.slice(1).join(delimiter)];
};

export const getFieldAttributes = (field: string): IFieldAttributes => {
	let dataType;
	let newField;
	let logType;

	if (field.startsWith('attributes_')) {
		logType = MetricsType.Tag;
		const stringWithoutPrefix = field.slice('attributes_'.length);
		const parts = splitOnce(stringWithoutPrefix, '.');
		[dataType, newField] = parts;
	} else if (field.startsWith('resources_')) {
		logType = MetricsType.Resource;
		const stringWithoutPrefix = field.slice('resources_'.length);
		const parts = splitOnce(stringWithoutPrefix, '.');
		[dataType, newField] = parts;
	} else if (field.startsWith('scope_string')) {
		logType = MetricsType.Scope;
		const stringWithoutPrefix = field.slice('scope_'.length);
		const parts = splitOnce(stringWithoutPrefix, '.');
		[dataType, newField] = parts;
	}

	return { dataType, newField, logType };
};

// Returns key to be used when filtering for `field` via
// the query builder. This is useful for powering filtering
// by field values from log details view.
export const filterKeyForField = (field: string): string => {
	// Must work for all 3 of the following types of cases
	// timestamp -> timestamp
	// attributes_string.log.file -> log.file
	// resources_string.k8s.pod.name -> k8s.pod.name
	const fieldAttribs = getFieldAttributes(field);
	return fieldAttribs?.newField || field;
};

export const aggregateAttributesResourcesToString = (logData: ILog): string => {
	const outputJson: ILogAggregateAttributesResources = {
		body: logData.body,
		date: logData.date,
		id: logData.id,
		severityNumber: logData.severityNumber,
		severityText: logData.severityText,
		spanID: logData.spanID,
		timestamp: logData.timestamp,
		traceFlags: logData.traceFlags,
		traceId: logData.traceId,
		attributes: {},
		resources: {},
		scope: {},
		severity_text: logData.severity_text,
		severity_number: logData.severity_number,
	};

	Object.keys(logData).forEach((key) => {
		if (key.startsWith('attributes_')) {
			outputJson.attributes = outputJson.attributes || {};
			Object.assign(outputJson.attributes, logData[key as keyof ILog]);
		} else if (key.startsWith('resources_')) {
			outputJson.resources = outputJson.resources || {};
			Object.assign(outputJson.resources, logData[key as keyof ILog]);
		} else if (key.startsWith('scope_string')) {
			outputJson.scope = outputJson.scope || {};
			Object.assign(outputJson.scope, logData[key as keyof ILog]);
		} else {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			outputJson[key] = logData[key as keyof ILog];
		}
	});

	return JSON.stringify(outputJson, null, 2);
};

const isFloat = (num: number): boolean => num % 1 !== 0;

const isBooleanString = (str: string): boolean =>
	str.toLowerCase() === 'true' || str.toLowerCase() === 'false';

const determineType = (val: unknown): DataTypes => {
	if (typeof val === 'string') {
		if (isBooleanString(val)) {
			return DataTypes.bool;
		}

		const numberValue = parseFloat(val);

		if (!Number.isNaN(numberValue)) {
			return isFloat(numberValue) ? DataTypes.Float64 : DataTypes.Int64;
		}

		return DataTypes.String;
	}

	if (typeof val === 'number') {
		return isFloat(val) ? DataTypes.Float64 : DataTypes.Int64;
	}

	if (typeof val === 'boolean') {
		return DataTypes.bool;
	}

	return DataTypes.EMPTY;
};

export const getDataTypes = (value: unknown): DataTypes => {
	const getArrayType = (elementType: DataTypes): DataTypes =>
		typeToArrayTypeMapper[elementType] || DataTypes.EMPTY;

	if (Array.isArray(value)) {
		return getArrayType(determineType(value[0]));
	}

	return determineType(value);
};

// now we do not want to render colors everywhere like in tooltip and monaco editor hence we remove such codes to make
// the log line readable
export const removeEscapeCharacters = (str: string): string =>
	str
		.replace(/\\x1[bB][[0-9;]*m/g, '')
		.replace(/\\u001[bB][[0-9;]*m/g, '')
		.replace(/\\x[0-9A-Fa-f]{2}/g, '')
		.replace(/\\u[0-9A-Fa-f]{4}/g, '')
		.replace(/\\[btnfrv0'"\\]/g, '');

// we need to remove the escape from the escaped characters as some recievers like file log escape the unicode escape characters.
// example: Log [\u001B[32;1mThis is bright green\u001B[0m] is being sent as [\\u001B[32;1mThis is bright green\\u001B[0m]
//
// so we need to remove this escapes to render the color properly
export const unescapeString = (str: string): string =>
	str
		.replace(/\\n/g, '\n') // Replaces escaped newlines
		.replace(/\\r/g, '\r') // Replaces escaped carriage returns
		.replace(/\\t/g, '\t') // Replaces escaped tabs
		.replace(/\\b/g, '\b') // Replaces escaped backspaces
		.replace(/\\f/g, '\f') // Replaces escaped form feeds
		.replace(/\\v/g, '\v') // Replaces escaped vertical tabs
		.replace(/\\'/g, "'") // Replaces escaped single quotes
		.replace(/\\"/g, '"') // Replaces escaped double quotes
		.replace(/\\\\/g, '\\') // Replaces escaped backslashes
		.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) =>
			String.fromCharCode(parseInt(hex, 16)),
		) // Replaces hexadecimal escape sequences
		.replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) =>
			String.fromCharCode(parseInt(hex, 16)),
		); // Replaces Unicode escape sequences

export function removeExtraSpaces(input: string): string {
	return input.replace(/\s+/g, ' ').trim();
}

export function findKeyPath(
	obj: AnyObject,
	targetKey: string,
	currentPath = '',
): string | null {
	let finalPath = null;
	Object.keys(obj).forEach((key) => {
		const value = obj[key];
		const newPath = currentPath ? `${currentPath}.${key}` : key;

		if (key === targetKey) {
			finalPath = newPath;
		}

		if (typeof value === 'object' && value !== null) {
			const result = findKeyPath(value, targetKey, newPath);
			if (result) {
				finalPath = result;
			}
		}
	});
	return finalPath;
}
