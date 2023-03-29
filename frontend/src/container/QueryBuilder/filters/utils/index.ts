import {
	AttributeKeyOptions,
	getAttributesKeys,
	getAttributesValues,
	TagKeyValueProps,
} from 'api/queryBuilder/getAttributesKeysValues';
import { IOption } from 'container/FormAlertRules/labels/types';

export const GetTagKeys = async (
	body: TagKeyValueProps,
): Promise<IOption[]> => {
	const { payload } = await getAttributesKeys(body);
	if (!payload || !payload?.data) {
		return [];
	}
	return payload.data.attributeKeys.map((tagKey: AttributeKeyOptions) => ({
		label: tagKey.key,
		value: tagKey.key,
	}));
};

export const GetTagValues = async (
	attributeKey: string,
	dataSource: string,
): Promise<IOption[]> => {
	const { payload } = await getAttributesValues({
		attributeKey,
		dataSource,
	});

	if (!payload || !payload?.data) {
		return [];
	}
	return payload.data.attributeValues.map((tagKey: AttributeKeyOptions) => ({
		label: tagKey.key,
		value: tagKey.key,
	}));
};
