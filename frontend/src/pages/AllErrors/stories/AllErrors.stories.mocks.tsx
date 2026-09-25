/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import set from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';

import {
	choiceControl,
	countControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import {
	RESPONSE_STATES,
	type ResponseState,
	respondWith,
} from '@/storybook/runtime/responseState';
import { fieldValuesResponse } from '@/storybook/msw/__story_mockdata__/fields';

import {
	EXCEPTION_CATALOGUE_SIZE,
	EXCEPTION_QUICK_FILTER_CAP,
	exceptionAttributeKeysResponse,
	exceptionAttributeValuesResponse,
	exceptionFieldKeysResponse,
	exceptionQuickFiltersResponse,
	exceptionRows,
	exceptionTotal,
	type ListErrorsBody,
} from './__story_mockdata__/exceptions';

const LIST = 'Exceptions · list';
const FILTERS = 'Exceptions · filters';

export const exceptionsMocks = defineStoryMocks({
	controls: {
		exceptions: countControl('Exception groups', {
			group: LIST,
			description:
				'Groups the endpoint holds. The table asks for one page at a time and pages against `/countErrors`, so a count past ten paginates.',
			value: EXCEPTION_CATALOGUE_SIZE,
			max: EXCEPTION_CATALOGUE_SIZE,
		}),
		quickFilters: countControl('Quick filters', {
			group: FILTERS,
			description:
				'Filters the org has configured for exceptions. At 0 the panel has nothing to render, which is what a workspace that never customised them shows.',
			value: 6,
			max: EXCEPTION_QUICK_FILTER_CAP,
		}),
		filterKeys: choiceControl<ResponseState>('Filter keys', {
			group: FILTERS,
			description:
				'How `/autocomplete/attribute_keys` answers when the resource filter opens, apart from the page-wide Data control.',
			options: RESPONSE_STATES,
			value: 'loaded',
		}),
		filterPanel: toggleControl('Quick filters panel', {
			group: FILTERS,
			description:
				'Whether the panel starts expanded. The page keeps this in local storage, so it survives the collapse arrow being clicked.',
			value: true,
		}),
	},
	handlers: (values, response) => [
		rest.post(
			'http://localhost/api/v1/listErrors',
			response.json(async (req) => {
				const body = (await req.json()) as ListErrorsBody;

				return exceptionRows(values.exceptions, body);
			}),
		),

		rest.post(
			'http://localhost/api/v1/countErrors',
			response.json(async (req) => {
				const body = (await req.json()) as ListErrorsBody;

				return exceptionTotal(values.exceptions, body);
			}),
		),

		rest.get(
			'http://localhost/api/v2/quick_filters/:source',
			response.json(() => exceptionQuickFiltersResponse(values.quickFilters)),
		),

		rest.get(
			'http://localhost/api/v1/fields/keys',
			response.json((req) =>
				exceptionFieldKeysResponse(req.url.searchParams.get('searchText')),
			),
		),

		rest.get(
			'http://localhost/api/v1/fields/values',
			response.json((req) =>
				fieldValuesResponse(
					exceptionAttributeValuesResponse(req.url.searchParams.get('name'), null)
						.data.stringAttributeValues ?? [],
				),
			),
		),

		rest.get(
			'http://localhost/api/v3/autocomplete/attribute_keys',
			respondWith(values.filterKeys, (req) =>
				exceptionAttributeKeysResponse(req.url.searchParams.get('searchText')),
			),
		),

		rest.get(
			'http://localhost/api/v3/autocomplete/attribute_values',
			response.json((req) =>
				exceptionAttributeValuesResponse(
					req.url.searchParams.get('attributeKey'),
					req.url.searchParams.get('searchText'),
				),
			),
		),
	],
	effect: (values) => {
		set(LOCALSTORAGE.SHOW_EXCEPTIONS_QUICK_FILTERS, String(values.filterPanel));
	},
});
