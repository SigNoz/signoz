import type { GetFieldsKeys200 } from 'api/generated/services/sigNoz.schemas';
import {
	TelemetrytypesFieldContextDTO,
	TelemetrytypesFieldDataTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { rest } from 'msw';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource, SIGNAL_TO_DATA_SOURCE } from 'types/common/queryBuilder';

import {
	autocompleteKeysResponse,
	autocompleteValuesResponse,
} from './__story_mockdata__/queryBuilderAutocomplete';

/**
 * The v5 keys list, served from the same per-signal fixture as the v3 pair so
 * the group-by and order-by filters open on the product's keys. A context
 * prefix in `searchText` narrows to that context the way the backend does.
 */
const fieldKeysResponseForSignal = (
	signal: string | null,
	searchText: string,
): GetFieldsKeys200 => {
	const context = Object.values(TelemetrytypesFieldContextDTO).find(
		(ctx) => ctx && searchText.toLowerCase().startsWith(`${ctx}.`),
	);
	const keys = (
		autocompleteKeysResponse(
			SIGNAL_TO_DATA_SOURCE[signal as TelemetrytypesSignalDTO] ?? DataSource.LOGS,
			context ? searchText.slice(context.length + 1) : searchText,
		).data.attributeKeys ?? []
	).map((attribute) => ({
		name: attribute.key,
		signal: signal as TelemetrytypesSignalDTO,
		fieldContext:
			attribute.type === 'resource'
				? TelemetrytypesFieldContextDTO.resource
				: TelemetrytypesFieldContextDTO.attribute,
		fieldDataType: (attribute.dataType === DataTypes.Int64 ||
		attribute.dataType === DataTypes.Float64
			? TelemetrytypesFieldDataTypeDTO.number
			: attribute.dataType) as TelemetrytypesFieldDataTypeDTO,
	}));

	return {
		status: 'success',
		data: {
			complete: true,
			keys: Object.fromEntries(
				keys
					.filter((key) => !context || key.fieldContext === context)
					.map((key) => [key.name, [key]]),
			),
		},
	};
};

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
	rest.get('http://localhost/api/v1/fields/keys', (req, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json(
				fieldKeysResponseForSignal(
					req.url.searchParams.get('signal'),
					req.url.searchParams.get('searchText') ?? '',
				),
			),
		),
	),
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
