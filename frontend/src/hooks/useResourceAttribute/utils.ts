import {
	getResourceAttributesTagKeys,
	getResourceAttributesTagValues,
} from 'api/metrics/getResourceAttributes';
import { OperatorConversions } from 'constants/resourceAttributes';
import ROUTES from 'constants/routes';
import {
	IOption,
	IResourceAttribute,
	IResourceAttributeProps,
} from 'hooks/useResourceAttribute/types';
import { decode } from 'js-base64';
import history from 'lib/history';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { OperatorValues, Tags } from 'types/reducer/trace';
import { v4 as uuid } from 'uuid';

import { whilelistedKeys } from './config';

/**
 * resource_x_y -> x.y
 */
export const convertMetricKeyToTrace = (key: string): string => {
	const splittedKey = key.split('_');

	if (splittedKey.length <= 1) {
		return '';
	}
	return splittedKey.splice(1).join('.');
};

/**
 * x.y -> resource_x_y
 */
export const convertTraceKeyToMetric = (key: string): string => {
	const splittedKey = key.split('.');
	return `resource_${splittedKey.join('_')}`;
};

export const convertOperatorLabelToMetricOperator = (label: string): string =>
	OperatorConversions.find((operator) => operator.label === label)
		?.metricValue || '';

export const convertOperatorLabelToTraceOperator = (
	label: string,
): OperatorValues =>
	OperatorConversions.find((operator) => operator.label === label)
		?.traceValue as OperatorValues;

export const convertRawQueriesToTraceSelectedTags = (
	queries: IResourceAttribute[],
	tagType = 'ResourceAttribute',
): Tags[] =>
	queries.map((query) => ({
		Key: convertMetricKeyToTrace(query.tagKey),
		Operator: convertOperatorLabelToTraceOperator(query.operator),
		StringValues: query.tagValue,
		NumberValues: [],
		BoolValues: [],
		TagType: tagType,
	}));

/* Convert resource attributes to tagFilter items for queryBuilder */
export const resourceAttributesToTagFilterItems = (
	queries: IResourceAttribute[],
): TagFilterItem[] =>
	queries.map((res) => ({
		id: `${res.id}`,
		key: { key: res.tagKey, isColumn: false, type: null, dataType: null },
		op: `${res.operator}`,
		value: `${res.tagValue}`.split(','),
	}));

export const OperatorSchema: IOption[] = OperatorConversions.map(
	(operator) => ({
		label: operator.label,
		value: operator.label,
	}),
);

export const GetTagKeys = async (): Promise<IOption[]> => {
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
): IResourceAttribute | null => {
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

export function getResourceAttributeQueriesFromURL(): IResourceAttribute[] {
	const resourceAttributeQuery = new URLSearchParams(
		history.location.search,
	).get('resourceAttribute');

	try {
		if (resourceAttributeQuery) {
			return JSON.parse(decode(resourceAttributeQuery)) as IResourceAttribute[];
		}
	} catch (error) {
		console.error(error);
	}

	return [];
}

export const isResourceEmpty = (
	queries: IResourceAttributeProps['queries'],
	staging: IResourceAttributeProps['staging'],
	selectedQuery: IResourceAttributeProps['selectedQuery'],
): boolean => !!(queries.length || staging.length || selectedQuery.length);

export const mappingWithRoutesAndKeys = (
	pathname: string,
	filters: IOption[],
): IOption[] => {
	if (ROUTES.SERVICE_MAP === pathname) {
		return filters.filter((filter) => whilelistedKeys.includes(filter.value));
	}
	return filters;
};
