import { rest } from 'msw';

import {
	autocompleteKeysResponse,
	autocompleteValuesResponse,
} from './__story_mockdata__/queryBuilderAutocomplete';

/**
 * The query shapes `src/mocks-server/handlers.ts` answers from its own fixture:
 * the APM resource attribute filter, the one case its two autocomplete handlers
 * were written for. Everything else there falls through to a 500, which is what
 * these handlers exist to cover, so those shapes are handed back rather than
 * answered twice with different data.
 */
const isSharedFixtureKeysQuery = (params: URLSearchParams): boolean =>
	params.get('metricName') === 'signoz_calls_total' &&
	params.get('match') === 'resource_';

const isSharedFixtureValuesQuery = (params: URLSearchParams): boolean => {
	const attributeKey = params.get('attributeKey');

	return (
		attributeKey === 'serviceName' ||
		attributeKey === 'name' ||
		(params.get('metricName') === 'signoz_calls_total' &&
			params.get('tagKey') === 'resource_signoz_collector_id')
	);
};

/**
 * The legacy v3 autocomplete pair. The jest handlers answer it for the one query
 * the suite asserts on and return 500 for every other, which is every other
 * filter input in the product: the panel editor's logs list panel, the
 * explorers' legacy query builder, the resource attribute filter on a signal
 * they were not written for. Resolved ahead of the jest set so those get a
 * usable list; a page that wants its own keys still declares them and wins over
 * both. Returning nothing hands the request on to the next matching handler.
 */
export const queryBuilderHandlers = [
	rest.get(
		'http://localhost/api/v3/autocomplete/attribute_keys',
		(req, res, ctx) => {
			if (isSharedFixtureKeysQuery(req.url.searchParams)) {
				return undefined;
			}

			return res(
				ctx.status(200),
				ctx.json(
					autocompleteKeysResponse(
						req.url.searchParams.get('dataSource'),
						req.url.searchParams.get('searchText') ?? '',
					),
				),
			);
		},
	),

	rest.get(
		'http://localhost/api/v3/autocomplete/attribute_values',
		(req, res, ctx) => {
			if (isSharedFixtureValuesQuery(req.url.searchParams)) {
				return undefined;
			}

			return res(
				ctx.status(200),
				ctx.json(
					autocompleteValuesResponse(
						req.url.searchParams.get('attributeKey') ??
							req.url.searchParams.get('tagKey'),
						req.url.searchParams.get('searchText') ?? '',
					),
				),
			);
		},
	),
];
