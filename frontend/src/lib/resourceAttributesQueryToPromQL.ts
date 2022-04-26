import { IResourceAttributeQuery } from 'container/MetricsApplication/ResourceAttributesFilter/types';

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

/**
 * Converts Resource Attribute Queries to PromQL query string
 */
export const resourceAttributesQueryToPromQL = (
	queries: IResourceAttributeQuery[],
): string => {
	let parsedQueryString = '';

	if (Array.isArray(queries))
		queries.forEach((query) => {
			parsedQueryString += `, ${convertTraceKeyToMetric(query.tagKey)}${
				query.operator
			}"${query.tagValue.join('|')}"`;
		});

	return parsedQueryString;
};
