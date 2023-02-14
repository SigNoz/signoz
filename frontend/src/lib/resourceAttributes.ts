import { OperatorConversions } from 'constants/resourceAttributes';
import { IResourceAttributeQuery } from 'container/MetricsApplication/ResourceAttributesFilter/types';
import { IQueryBuilderTagFilterItems } from 'types/api/dashboard/getAll';
import { OperatorValues, Tags } from 'types/reducer/trace';

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
	queries: IResourceAttributeQuery[],
): Tags[] =>
	queries.map((query) => ({
		Key: convertMetricKeyToTrace(query.tagKey),
		Operator: convertOperatorLabelToTraceOperator(query.operator),
		StringValues: query.tagValue,
		NumberValues: [],
		BoolValues: [],
	}));

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
): IQueryBuilderTagFilterItems[] =>
	queries.map((res) => ({
		id: `${res.id}`,
		key: `${res.tagKey}`,
		op: `${res.operator}`,
		value: `${res.tagValue}`.split(','),
	}));
