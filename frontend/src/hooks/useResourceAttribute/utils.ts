import { getFieldsKeys, getFieldsValues } from 'api/generated/services/fields';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas/telemetrytypesSignalDTO';
import {
	CompositeQueryOperatorsConfig,
	OperatorConversions,
} from 'constants/resourceAttributes';
import ROUTES from 'constants/routes';
import { MetricsType, WidgetKeys } from 'container/MetricsApplication/constant';
import type {
	IOption,
	IResourceAttribute,
	IResourceAttributeProps,
	OperatorValues,
	Tags,
} from 'hooks/useResourceAttribute/types';
import { decode } from 'js-base64';
import { getCurrentLocation } from 'lib/router/navigation';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
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

export function convertOperatorLabelForExceptions(
	label: string,
): OperatorValues {
	return CompositeQueryOperatorsConfig.find(
		(operator) => operator.label === label,
	)?.traceValue as OperatorValues;
}

export function formatStringValuesForTrace(
	val: TagFilterItem['value'] = [],
): string[] {
	// IN QB V5 we can pass array of all (boolean, number, string) values. To make this compatible with the old version, we need to convert the array to a string array.
	return !Array.isArray(val) ? [String(val)] : val.map((item) => String(item));
}

export const convertCompositeQueryToTraceSelectedTags = (
	filterItems: TagFilterItem[] = [],
): Tags[] =>
	filterItems.map((item) => ({
		Key: item?.key?.key,
		Operator: convertOperatorLabelForExceptions(item.op),
		StringValues: formatStringValuesForTrace(item?.value),
		NumberValues: [],
		BoolValues: [],
		TagType: 'ResourceAttribute',
	})) as Tags[];

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
		key: {
			key: res.tagKey,
			type: '',
			dataType: DataTypes.EMPTY,
		},
		op: `${res.operator}`,
		value: `${res.tagValue}`.split(','),
	}));
/* Convert resource attributes to trace filters items for queryBuilder */
export const resourceAttributesToTracesFilterItems = (
	queries: IResourceAttribute[],
): TagFilterItem[] =>
	queries.map((res) => ({
		id: `${res.id}`,
		key: {
			key: convertMetricKeyToTrace(res.tagKey),
			type: MetricsType.Resource,
			dataType: DataTypes.String,
			id: `${convertMetricKeyToTrace(res.tagKey)}--string--resource--true`,
		},
		op: `${res.operator === 'Not IN' ? 'nin' : res.operator}`,
		value: res.tagValue,
	}));

export const OperatorSchema: IOption[] = OperatorConversions.map(
	(operator) => ({
		label: operator.label,
		value: operator.label,
	}),
);

export const getResourceDeploymentKeys = (): string =>
	'resource_deployment.environment';

const getSpanMetricKeys = async (searchText: string): Promise<string[]> => {
	try {
		const { data } = await getFieldsKeys({
			signal: TelemetrytypesSignalDTO.metrics,
			metricName: WidgetKeys.SignozCallsTotal,
			searchText,
		});
		return Object.keys(data.keys ?? {});
	} catch {
		return [];
	}
};

export const GetTagKeys = async (): Promise<IOption[]> => {
	const resourceDeploymentKey = getResourceDeploymentKeys();
	const keys = await getSpanMetricKeys('resource_');

	return keys
		.filter((tagKey: string) => tagKey !== resourceDeploymentKey)
		.map((tagKey: string) => ({
			label: convertMetricKeyToTrace(tagKey),
			value: tagKey,
		}));
};

export const getEnvironmentTagKeys = async (): Promise<IOption[]> => {
	const keys = await getSpanMetricKeys(getResourceDeploymentKeys());
	return keys.map((tagKey: string) => ({
		label: convertMetricKeyToTrace(tagKey),
		value: tagKey,
	}));
};

export const GetTagValues = async (tagKey: string): Promise<IOption[]> => {
	try {
		const { data } = await getFieldsValues({
			signal: TelemetrytypesSignalDTO.metrics,
			metricName: WidgetKeys.SignozCallsTotal,
			name: tagKey,
		});
		const values = data.values.stringValues ?? [];

		return values.map((tagValue: string) => ({
			label: tagValue,
			value: tagValue,
		}));
	} catch {
		return [];
	}
};

export const getEnvironmentTagValues = (): Promise<IOption[]> =>
	GetTagValues(getResourceDeploymentKeys());

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

export const updateQuery = (
	queryKey: string,
	selectedItems: Array<string | string[]> = [],
	// eslint-disable-next-line sonarjs/no-identical-functions
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
		getCurrentLocation().search,
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

export const filterServiceMapSupportedQueries = (
	queries: IResourceAttribute[],
): IResourceAttribute[] =>
	queries.filter((query) => whilelistedKeys.includes(query.tagKey));
