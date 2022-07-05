import {
	getResourceAttributesTagKeys,
	getResourceAttributesTagValues,
} from 'api/metrics/getResourceAttributes';
import { OperatorConversions } from 'constants/resourceAttributes';
import { convertMetricKeyToTrace } from 'lib/resourceAttributes';
import { v4 as uuid } from 'uuid';

import { IOption, IResourceAttributeQuery } from './types';

export const OperatorSchema: IOption[] = OperatorConversions.map(
	(operator) => ({
		label: operator.label,
		value: operator.label,
	}),
);

export const GetTagKeys = async (): Promise<IOption[]> => {
	// if (TagKeysCache) {
	// 	return new Promise((resolve) => {
	// 		resolve(TagKeysCache);
	// 	});
	// }
	const { payload } = await getResourceAttributesTagKeys({
		metricName: 'signoz_calls_total',
		match: 'resource_',
	});
	if (!payload || !payload?.data) {
		return [];
	}
	return payload.data.map((tagKey: string) => ({
		label: convertMetricKeyToTrace(tagKey),
		value: tagKey,
	}));
};

export const GetTagValues = async (tagKey: string): Promise<IOption[]> => {
	const { payload } = await getResourceAttributesTagValues({
		tagKey,
		metricName: 'signoz_calls_total',
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
