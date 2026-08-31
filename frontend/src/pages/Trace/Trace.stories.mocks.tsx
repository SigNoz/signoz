/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	spanFiltersResponse,
	spansAggregateResponse,
	spansGraphResponse,
	tagFiltersResponse,
	tagValuesResponse,
} from './__story_mockdata__/trace';

const SPANS = 'Legacy traces · spans';
const FILTERS = 'Legacy traces · filters';

const PAGE_SIZE = 10;

export const traceMocks = defineStoryMocks({
	controls: {
		spans: countControl('Spans matched', {
			group: SPANS,
			description:
				'How many spans the filters leave, which the table pages through ten at a time.',
			value: 240,
			max: 1000,
		}),
		filterValues: countControl('Values per filter', {
			group: FILTERS,
			description:
				'Entries each filter panel on the left lists, with its span count beside it.',
			value: 5,
			max: 5,
		}),
	},
	handlers: (values, response) => [
		rest.post(
			'http://localhost/api/v1/getSpanFilters',
			response.json(async (req) => {
				const body = (await req.json()) as { getFilters?: string[] };

				return spanFiltersResponse(body.getFilters ?? [], values.filterValues);
			}),
		),
		rest.post(
			'http://localhost/api/v1/getFilteredSpans',
			response.json(async (req) => {
				const body = (await req.json()) as { offset?: number; limit?: number };
				const offset = body.offset ?? 0;

				return spansAggregateResponse(
					Math.max(Math.min(body.limit ?? PAGE_SIZE, values.spans - offset), 0),
					values.spans,
					offset,
				);
			}),
		),
		rest.post(
			'http://localhost/api/v1/getFilteredSpans/aggregates',
			response.json(async (req) => {
				const body = (await req.json()) as {
					start: number;
					end: number;
					step: number;
				};

				return spansGraphResponse(
					body.start,
					body.end,
					body.step,
					Math.max(Math.round(values.spans / 20), 1),
				);
			}),
		),
		rest.post(
			'http://localhost/api/v1/getTagFilters',
			response.json(() => tagFiltersResponse()),
		),
		rest.post(
			'http://localhost/api/v1/getTagValues',
			response.json(() => tagValuesResponse()),
		),
	],
	config: () => ({ route: ROUTES.TRACE }),
});
