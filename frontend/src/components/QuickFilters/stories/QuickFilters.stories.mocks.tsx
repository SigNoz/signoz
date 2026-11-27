/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	QuickfiltertypesSourceDTO,
	TelemetrytypesFieldContextDTO,
	TelemetrytypesFieldDataTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { rest, type RequestHandler } from 'msw';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import {
	fieldKeysResponse,
	fieldValuesResponse,
} from '@/storybook/msw/__story_mockdata__/fields';
import { quickFiltersResponse } from '@/storybook/msw/__story_mockdata__/quickFilters';

import { DEFAULT_VISIBLE_ITEMS_COUNT } from '../FilterRenderers/Checkbox/constants';
import { FiltersType, QuickFilterCheckboxUseFieldApis } from '../types';

const customFilters = [
	{
		name: 'service.name',
		fieldDataType: TelemetrytypesFieldDataTypeDTO.string,
		fieldContext: TelemetrytypesFieldContextDTO.resource,
	},
	{
		name: 'deployment.environment',
		fieldDataType: TelemetrytypesFieldDataTypeDTO.string,
		fieldContext: TelemetrytypesFieldContextDTO.resource,
	},
];

export const queryBuilder = {
	currentQuery: {
		builder: {
			queryData: [
				{
					filter: { expression: '' },
					filters: { items: [], op: 'AND' },
					queryName: 'Logs query',
				},
			],
		},
	},
	lastUsedQuery: 0,
	panelType: 'graph',
	redirectWithQueryBuilderData: (): void => undefined,
	setLastUsedQuery: (): void => undefined,
};

export const checkboxConfig = [
	{
		attributeKey: {
			dataType: DataTypes.String,
			key: 'service.name',
			type: 'resource',
		},
		defaultOpen: true,
		title: 'Service name',
		type: FiltersType.CHECKBOX,
	},
];

export const fieldApis: QuickFilterCheckboxUseFieldApis = {
	startUnixMilli: 1700000000000,
	endUnixMilli: 1700003600000,
	existingQuery: null,
};

export const fieldValuesHandler = (values: readonly string[]): RequestHandler =>
	rest.get('http://localhost/api/v1/fields/values', (_req, res, ctx) =>
		res(ctx.status(200), ctx.json(fieldValuesResponse(values))),
	);

export const handlers = [
	rest.get('http://localhost/api/v2/quick_filters/logs', (_req, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json(
				quickFiltersResponse(QuickfiltertypesSourceDTO.logs, customFilters),
			),
		),
	),
	rest.get('http://localhost/api/v1/fields/keys', (_req, res, ctx) =>
		res(ctx.status(200), ctx.json(fieldKeysResponse(['k8s.namespace.name']))),
	),
	fieldValuesHandler(['checkout', 'frontend', 'payments']),
];

export const noSavedFiltersHandler = rest.get(
	'http://localhost/api/v2/quick_filters/logs',
	(_req, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json(quickFiltersResponse(QuickfiltertypesSourceDTO.logs, [])),
		),
);

export const noSavedTracesFiltersHandler = rest.get(
	'http://localhost/api/v2/quick_filters/traces',
	(_req, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json(quickFiltersResponse(QuickfiltertypesSourceDTO.traces, [])),
		),
);

export const loadingFiltersHandlers = [
	rest.get('http://localhost/api/v2/quick_filters/logs', (_req, res, ctx) =>
		res(ctx.delay('infinite')),
	),
];

export const longTitleConfig = [
	{
		attributeKey: {
			dataType: DataTypes.Int64,
			key: 'http.request.content_length_uncompressed',
			type: 'tag',
		},
		defaultOpen: false,
		title: 'Http Request Content Length Uncompressed',
		type: FiltersType.CHECKBOX,
	},
];

export const LONG_FILTER_VALUES = [
	'checkout-service.production-eu-central-1.svc.cluster.local',
	'payments-authorisation-worker.production-us-east-2.svc.cluster.local',
	'catalog-availability-projector.staging-ap-south-1.svc.cluster.local',
];

export const selectedServiceQueryBuilder = {
	...queryBuilder,
	currentQuery: {
		builder: {
			queryData: [
				{
					filter: { expression: '' },
					filters: {
						items: [
							{
								key: {
									dataType: DataTypes.String,
									key: 'service.name',
									type: 'resource',
								},
								op: 'in',
								value: ['checkout', 'payments'],
							},
						],
						op: 'AND',
					},
					queryName: 'Logs query',
				},
			],
		},
	},
};

/** More values than the checkbox filter shows before Show More. */
export const MANY_FILTER_VALUES = Array.from(
	{ length: 2 * DEFAULT_VISIBLE_ITEMS_COUNT + 5 },
	(_, index) => `service-${String(index + 1).padStart(2, '0')}`,
);
