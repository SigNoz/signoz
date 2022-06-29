import {
	getResourceAttributesTagKeys,
	getResourceAttributesTagValues,
} from 'api/metrics/getResourceAttributes';
import { v4 as uuid } from 'uuid';

import { TagKeyOperator } from '../../Options';
import { IOption, ITagKeyValueQuery } from './types';

export const OperatorSchema: IOption[] = TagKeyOperator;

export const GetTagKeys = async (metricName: string): Promise<IOption[]> => {
	const { payload } = await getResourceAttributesTagKeys({ metricName });
	if (!payload || !payload?.data) {
		return [];
	}
	return payload.data.map((tagKey: string) => ({
		label: tagKey,
		value: tagKey,
	}));
};

export const GetTagValues = async (
	tagKey: string,
	metricName: string,
): Promise<IOption[]> => {
	const { payload } = await getResourceAttributesTagValues({
		tagKey,
		metricName,
	});

	if (!payload || !payload?.data) {
		return [];
	}
	return payload.data.map((tagValue: string) => ({
		label: tagValue,
		value: tagValue,
	}));
};

export const createQuery = (
	selectedItems: Array<string | string[]> = [],
): ITagKeyValueQuery | null => {
	if (selectedItems.length === 3) {
		return {
			id: uuid().slice(0, 8),
			key: typeof selectedItems[0] === 'string' ? selectedItems[0] : '',
			op: typeof selectedItems[1] === 'string' ? selectedItems[1] : '',
			value: selectedItems[2] as string[],
		};
	}
	return null;
};

export const SingleValueOperators = ['LIKE', 'NLIKE'];
