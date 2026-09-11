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

import { attributeValuesResponse } from '@/storybook/msw/__story_mockdata__/attributes';
import { fieldKeysResponse } from '@/storybook/msw/__story_mockdata__/fields';
import { quickFiltersResponse } from '@/storybook/msw/__story_mockdata__/quickFilters';

import { FiltersType } from './types';

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

export const attributeValuesHandler = (
	values: readonly string[],
): RequestHandler =>
	rest.get(
		'http://localhost/api/v3/autocomplete/attribute_values',
		(_req, res, ctx) =>
			res(ctx.status(200), ctx.json(attributeValuesResponse(values))),
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
	attributeValuesHandler(['checkout', 'frontend', 'payments']),
];

export const loadingFiltersHandlers = [
	rest.get('http://localhost/api/v2/quick_filters/logs', (_req, res, ctx) =>
		res(ctx.delay('infinite')),
	),
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
