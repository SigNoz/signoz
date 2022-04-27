import { IResourceAttributeQuery } from 'container/MetricsApplication/ResourceAttributesFilter/types';
import { decode, encode } from 'js-base64';
import history from 'lib/history';
import { resourceAttributesQueryToPromQL } from 'lib/resourceAttributes';
import { SET_RESOURCE_ATTRIBUTE_QUERIES } from 'types/actions/metrics';

export function GetResourceAttributeQueriesFromURL():
	| IResourceAttributeQuery[]
	| null {
	const resourceAttributeQuery = new URLSearchParams(
		history.location.search,
	).get('resourceAttribute');

	try {
		if (resourceAttributeQuery) {
			return JSON.parse(
				decode(resourceAttributeQuery),
			) as IResourceAttributeQuery[];
		}
	} catch (error) {
		console.error(error);
	}

	return null;
}

export const SetResourceAttributeQueriesFromURL = (
	queries: IResourceAttributeQuery[],
): void => {
	history.push({
		pathname: history.location.pathname,
		search:
			queries && queries.length
				? `?resourceAttribute=${encode(JSON.stringify(queries))}`
				: '',
	});
};
export const SetResourceAttributeQueries = (
	queries: IResourceAttributeQuery[],
): {
	type: typeof SET_RESOURCE_ATTRIBUTE_QUERIES;
	payload: {
		queries: IResourceAttributeQuery[];
		promQLQuery: string;
	};
} => {
	SetResourceAttributeQueriesFromURL(queries);
	return {
		type: SET_RESOURCE_ATTRIBUTE_QUERIES,
		payload: {
			queries,
			promQLQuery: resourceAttributesQueryToPromQL(queries),
		},
	};
};
