/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	GROUP_SAVES,
	type GroupSave,
	MAPPING_GROUP_MAX,
	spanMapperGroupsResponse,
	wideConditionGroupsResponse,
} from './__story_mockdata__/attributeMapping';

const GROUPS = 'Attribute mapping · groups';
const SAVE = 'Attribute mapping · save';

let groupsSaved = false;

export const wideConditionGroup = rest.get(
	'http://localhost/api/v1/span_mapper_groups',
	(_req, res, ctx) =>
		res(ctx.status(200), ctx.json(wideConditionGroupsResponse())),
);

export const attributeMappingMocks = defineStoryMocks({
	controls: {
		groups: countControl('Mapping groups', {
			group: GROUPS,
			description:
				'Groups the list has, one per SDK whose attributes are remapped. Zero is a workspace that has not set any up.',
			value: 3,
			max: MAPPING_GROUP_MAX,
		}),
		groupsSave: choiceControl<GroupSave>('Save changes', {
			group: SAVE,
			description:
				'How the PATCH behind "Save changes" answers. `success` raises the saved toast, `loading` never answers, `error` raises the failure toast, `refreshFailed` saves but fails the list refetch that follows, which raises the warning toast.',
			options: GROUP_SAVES,
			value: 'success',
		}),
	},
	handlers: (values) => {
		groupsSaved = false;

		return [
			rest.patch(
				'http://localhost/api/v1/span_mapper_groups/:groupId',
				(_req, res, ctx) => {
					if (values.groupsSave === 'loading') {
						return res(ctx.delay('infinite'));
					}
					if (values.groupsSave === 'error') {
						return res(
							ctx.status(500),
							ctx.json({
								status: 'error',
								error: { code: 'internal', message: 'Could not update the group' },
							}),
						);
					}
					groupsSaved = true;

					return res(ctx.status(204));
				},
			),
			rest.get('http://localhost/api/v1/span_mapper_groups', (_req, res, ctx) =>
				values.groupsSave === 'refreshFailed' && groupsSaved
					? res(ctx.status(500), ctx.json({ status: 'error' }))
					: res(ctx.status(200), ctx.json(spanMapperGroupsResponse(values.groups))),
			),
		];
	},
	config: () => ({ route: ROUTES.AI_OBSERVABILITY_ATTRIBUTE_MAPPING }),
});
