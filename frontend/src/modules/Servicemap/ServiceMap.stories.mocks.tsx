/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { encode } from 'js-base64';
import type { Tags } from 'types/reducer/trace';

import {
	choiceControl,
	countControl,
	multiChoiceControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	attributeKeysFor,
	attributeKeysResponse,
	attributeValuesFor,
	attributeValuesResponse,
	dependencyGraphResponse,
	MAX_DEPENDENCIES,
	RESOURCE_FILTERS,
	type ResourceFilter,
	resourceFilterQueries,
	SERVICE_HEALTH,
	type ServiceHealth,
} from './__story_mockdata__/serviceMap';

const GRAPH = 'Service map · graph';
const FILTERS = 'Service map · filters';

interface DependencyGraphBody {
	tags?: Tags[];
}

const serviceMapRoute = (filters: readonly ResourceFilter[]): string => {
	if (filters.length === 0) {
		return ROUTES.SERVICE_MAP;
	}

	const params = new URLSearchParams({
		[QueryParams.resourceAttributes]: encode(
			JSON.stringify(resourceFilterQueries(filters)),
		),
	});

	return `${ROUTES.SERVICE_MAP}?${params.toString()}`;
};

export const serviceMapMocks = defineStoryMocks({
	controls: {
		services: countControl('Dependencies', {
			group: GRAPH,
			description:
				'Call edges the endpoint answers with. Every one of them is a link and its two nodes; 0 is the "No Service Found" card.',
			value: MAX_DEPENDENCIES,
			max: MAX_DEPENDENCIES,
		}),
		health: choiceControl<ServiceHealth>('Service health', {
			group: GRAPH,
			description:
				'Error rate on the calls into a service, which is what turns its node red.',
			options: SERVICE_HEALTH,
			value: 'degraded',
		}),
		filters: multiChoiceControl<ResourceFilter>('Applied filters', {
			group: FILTERS,
			description:
				'Resource attributes the page opens with, as the environment selector and a chip. The graph narrows to what they match.',
			options: RESOURCE_FILTERS,
			value: [],
		}),
		environments: countControl('Environments', {
			group: FILTERS,
			description: 'Values the environment selector offers.',
			value: 3,
			max: 5,
		}),
		resourceAttributes: toggleControl('Resource attributes ingested', {
			group: FILTERS,
			description:
				'Off answers both autocomplete endpoints with nothing, which is what the filter reports as no resource attributes available.',
			value: true,
		}),
	},
	handlers: (values, response) => [
		rest.post(
			'http://localhost/api/v1/dependency_graph',
			response.json(async (req) => {
				const body = (await req.json()) as DependencyGraphBody;

				return dependencyGraphResponse({
					count: values.services,
					health: values.health,
					tags: body.tags,
				});
			}),
		),

		rest.get(
			'http://localhost/api/v3/autocomplete/attribute_keys',
			response.json((req) =>
				attributeKeysResponse(
					values.resourceAttributes
						? attributeKeysFor(req.url.searchParams.get('searchText'))
						: [],
				),
			),
		),

		rest.get(
			'http://localhost/api/v3/autocomplete/attribute_values',
			response.json((req) =>
				attributeValuesResponse(
					values.resourceAttributes
						? attributeValuesFor(
								req.url.searchParams.get('attributeKey'),
								values.environments,
							)
						: [],
				),
			),
		),
	],
	config: (values) => ({ route: serviceMapRoute(values.filters) }),
});
