/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	CUSTOM_ROLE_MAX,
	rolesListResponse,
} from '../__story_mockdata__/roles';

const LIST = 'Roles · list';

export const rolesMocks = defineStoryMocks({
	controls: {
		customRoles: countControl('Custom roles', {
			group: LIST,
			description:
				'Roles the org wrote itself. The three managed ones are always listed above them.',
			value: 4,
			max: CUSTOM_ROLE_MAX,
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v1/roles',
			response.json(() => rolesListResponse(values.customRoles)),
		),
	],
	config: () => ({ route: ROUTES.ROLES_SETTINGS }),
});
