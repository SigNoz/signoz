import {
	getResourceAttributesTagKeys,
	getResourceAttributesTagValues,
} from 'api/metrics/getResourceAttributes';
import { convertMetricKeyToTrace } from 'lib/resourceAttributesQueryToPromQL';
import { v4 as uuid } from 'uuid';

import { IOption, IResourceAttributeQuery } from './types';

export const OperatorSchema: IOption[] = [
	{
		label: 'Not IN',
		value: '!~',
	},
	{
		label: 'IN',
		value: '=~',
	},
	{
		label: 'Equal',
		value: '=',
	},
	{
		label: 'Not Equal',
		value: '!=',
	},
];

let TagKeysCache: IOption[];
export const GetTagKeys = async (): Promise<IOption[]> => {
	if (TagKeysCache) {
		return new Promise((resolve) => {
			resolve(TagKeysCache);
		});
	}
	const { payload } = await getResourceAttributesTagKeys();
	if (!payload || !payload?.data) {
		return [];
	}
	const TagKeysOptions = payload.data.map((tagKey: string) => ({
		label: convertMetricKeyToTrace(tagKey),
		value: convertMetricKeyToTrace(tagKey),
	}));

	TagKeysCache = TagKeysOptions;
	return TagKeysOptions;
};

export const GetTagValues = async (tagKey: string): Promise<IOption[]> => {
	const { payload } = await getResourceAttributesTagValues(tagKey);

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
): IResourceAttributeQuery | null => {
	if (selectedItems.length === 3) {
		return {
			id: uuid().slice(0, 8),
			tagKey: selectedItems[0] as string,
			operator: selectedItems[1] as string,
			tagValue: selectedItems[2] as string[],
		};
	}
	return null;
};
