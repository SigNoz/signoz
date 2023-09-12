import { DataNode } from 'antd/es/tree';

import BodyTitleRenderer from './BodyTitleRenderer';
import { AnyObject } from './LogDetailedView.types';
import { DataTypes } from './types';

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
			return {
				key: nodeKey,
				title: <BodyTitleRenderer title={value as string} nodeKey={nodeKey} />,
				children: jsonToDataNodes({}, nodeKey, valueIsArray),
			};
		}

		if (typeof value === 'object' && value !== null) {
			return {
				key: nodeKey,
				title: valueIsArray ? (
					<BodyTitleRenderer title={key} isArray nodeKey={nodeKey} />
				) : (
					key
				),
				children: jsonToDataNodes(
					value as Record<string, unknown>,
					valueIsArray ? `${nodeKey}[*]` : nodeKey,
					valueIsArray,
				),
			};
		}
		return {
			key: nodeKey,
			title: <BodyTitleRenderer title={key} nodeKey={nodeKey} />,
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

export const getDataTypes = (
	value: number | number[] | string | string[],
): DataTypes => {
	if (typeof value === 'string') {
		return DataTypes.String;
	}

	if (typeof value === 'number') {
		return isFloat(value) ? DataTypes.Float64 : DataTypes.Int64;
	}

	if (Array.isArray(value)) {
		const firstElement = value[0];

		if (typeof firstElement === 'string') {
			return DataTypes.ArrayString;
		}

		if (typeof firstElement === 'number') {
			return isFloat(firstElement) ? DataTypes.ArrayFloat64 : DataTypes.ArrayInt64;
		}
	}

	return DataTypes.Int64;
};
