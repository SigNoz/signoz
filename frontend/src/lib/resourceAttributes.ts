import { OperatorConversions } from 'constants/resourceAttributes';
import { IResourceAttributeQuery } from 'container/MetricsApplication/ResourceAttributesFilter/types';
import { IQueryBuilderTagFilterItems } from 'types/api/dashboard/getAll';
import { OperatorValues, Tags, TagsAPI } from 'types/reducer/trace';

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

export const convertOperatorLabelToMetricOperator = (label: string): string => {
	return (
		OperatorConversions.find((operator) => operator.label === label)
			?.metricValue || ''
	);
};

export const convertOperatorLabelToTraceOperator = (
	label: string,
): OperatorValues => {
	return OperatorConversions.find((operator) => operator.label === label)
		?.traceValue as OperatorValues;
};

export const convertRawQueriesToTraceSelectedTags = (
	queries: IResourceAttributeQuery[],
	keyType: 'string' | 'array' = 'string',
): Tags[] | TagsAPI[] => {
	return queries.map((query) => ({
		Key:
			keyType === 'array'
				? [convertMetricKeyToTrace(query.tagKey)]
				: (convertMetricKeyToTrace(query.tagKey) as never),
		Operator: convertOperatorLabelToTraceOperator(query.operator),
		Values: query.tagValue,
	}));
};

/**
 * Converts Resource Attribute Queries to PromQL query string
 */
export const resourceAttributesQueryToPromQL = (
	queries: IResourceAttributeQuery[],
): string => {
	let parsedQueryString = '';

	if (Array.isArray(queries))
		queries.forEach((query) => {
			parsedQueryString += `, ${
				query.tagKey
			}${convertOperatorLabelToMetricOperator(
				query.operator,
			)}"${query.tagValue.join('|')}"`;
		});

	return parsedQueryString;
};

/* Convert resource attributes to tagFilter items for queryBuilder */
export const resourceAttributesToTagFilterItems = (
	queries: IResourceAttributeQuery[],
): IQueryBuilderTagFilterItems[] => {
	return queries.map((res) => ({
		id: `${res.id}`,
		key: `${res.tagKey}`,
		op: `${res.operator}`,
		value: `${res.tagValue}`.split(','),
	}));
};
