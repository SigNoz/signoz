/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	MAPPING_GROUP_MAX,
	spanMapperGroupsResponse,
} from './__story_mockdata__/attributeMapping';

const GROUPS = 'Attribute mapping · groups';

export const attributeMappingMocks = defineStoryMocks({
	controls: {
		groups: countControl('Mapping groups', {
			group: GROUPS,
			description:
				'Groups the list has, one per SDK whose attributes are remapped. Zero is a workspace that has not set any up.',
			value: 3,
			max: MAPPING_GROUP_MAX,
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v1/span_mapper_groups',
			response.json(() => spanMapperGroupsResponse(values.groups)),
		),
	],
	config: () => ({ route: ROUTES.AI_OBSERVABILITY_ATTRIBUTE_MAPPING }),
});
