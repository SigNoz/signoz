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
		severity_text: logData.severity_text,
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

export const removeEscapeCharacters = (str: string): string =>
	str.replace(/\\([ntfr'"\\])/g, (_: string, char: string) => {
		const escapeMap: Record<string, string> = {
			n: '\n',
			t: '\t',
			f: '\f',
			r: '\r',
			"'": "'",
			'"': '"',
			'\\': '\\',
		};
		return escapeMap[char as keyof typeof escapeMap];
	});
