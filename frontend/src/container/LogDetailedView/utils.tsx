import { DataNode } from 'antd/es/tree';
import { MetricsType } from 'container/MetricsApplication/constant';
import { uniqueId } from 'lodash-es';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import BodyTitleRenderer from './BodyTitleRenderer';
import { AnyObject, IFieldAttributes } from './LogDetailedView.types';

export const recursiveParseJSON = (obj: string): Record<string, unknown> => {
	try {
		const value = JSON.parse(obj);
		if (typeof value === 'string') {
			return recursiveParseJSON(value);
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

const isFloat = (num: number): boolean => num % 1 !== 0;

export const getDataTypes = (value: unknown): DataTypes => {
	if (typeof value === 'string') {
		return DataTypes.String;
	}

	if (typeof value === 'number') {
		return isFloat(value) ? DataTypes.Float64 : DataTypes.Int64;
	}

	if (typeof value === 'boolean') {
		return DataTypes.bool;
	}

	if (Array.isArray(value)) {
		const firstElement = value[0];

		if (typeof firstElement === 'string') {
			return DataTypes.ArrayString;
		}

		if (typeof firstElement === 'boolean') {
			return DataTypes.ArrayBool;
		}

		if (typeof firstElement === 'number') {
			return isFloat(firstElement) ? DataTypes.ArrayFloat64 : DataTypes.ArrayInt64;
		}
	}

	return DataTypes.Int64;
};

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
