import type { GetFieldsKeys200 } from 'api/generated/services/sigNoz.schemas';
import {
	TelemetrytypesFieldContextDTO,
	TelemetrytypesFieldDataTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { rest } from 'msw';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource, SIGNAL_TO_DATA_SOURCE } from 'types/common/queryBuilder';

import { fieldValuesResponse } from './__story_mockdata__/fields';
import {
	listMetricsResponse,
	metricMetadataResponse,
} from './__story_mockdata__/metrics';
import {
	autocompleteKeysResponse,
	autocompleteValuesResponse,
} from './__story_mockdata__/queryBuilderAutocomplete';
import { QUERY_BUILDER_METRICS } from './__story_mockdata__/queryBuilderMetrics';

/**
 * The v5 keys list, served from the per-signal fixture so the group-by and
 * order-by filters open on the product's keys. A context
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
 * The query builder's keys, values and metrics, so every filter input opens on a
 * usable list. A page that wants its own still declares them and wins.
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
	// The AI query builder pins traces and reads the same shapes from its own
	// endpoints.
	rest.get(
		'http://localhost/api/v1/ai_observability/fields/keys',
		(req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json(
					fieldKeysResponseForSignal(
						TelemetrytypesSignalDTO.traces,
						req.url.searchParams.get('searchText') ?? '',
					),
				),
			),
	),
	...[
		'http://localhost/api/v1/fields/values',
		'http://localhost/api/v1/ai_observability/fields/values',
	].map((url) =>
		rest.get(url, (req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json(
					fieldValuesResponse(
						autocompleteValuesResponse(
							req.url.searchParams.get('name'),
							req.url.searchParams.get('searchText') ?? '',
						).data.stringAttributeValues ?? [],
					),
				),
			),
		),
	),
	rest.get('http://localhost/api/v2/metrics', (req, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json(
				listMetricsResponse(
					QUERY_BUILDER_METRICS,
					req.url.searchParams.get('searchText') ?? '',
				),
			),
		),
	),
	rest.get('http://localhost/api/v2/metrics/metadata', (req, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json(
				metricMetadataResponse(
					QUERY_BUILDER_METRICS,
					req.url.searchParams.get('metricName') ?? '',
				),
			),
		),
	),
];
