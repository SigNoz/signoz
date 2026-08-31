/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	ACTIVE_MEMBER_MAX,
	createdUserResponse,
	DELETED_MEMBER_MAX,
	INVITED_MEMBER_MAX,
	RESET_TOKEN_STATES,
	type ResetTokenState,
	resetPasswordTokenResponse,
	userDetailResponse,
	usersResponse,
} from './__story_mockdata__/members';

import {
	CUSTOM_ROLE_MAX,
	rolesListResponse,
} from '../__story_mockdata__/roles';

const LIST = 'Members · list';
const INVITES = 'Members · invites';

export const membersMocks = defineStoryMocks({
	controls: {
		active: countControl('Active members', {
			group: LIST,
			description: 'The table pages at twenty, so a longer list shows the pager.',
			value: 8,
			max: ACTIVE_MEMBER_MAX,
		}),
		invited: countControl('Pending invites', {
			group: LIST,
			value: 3,
			max: INVITED_MEMBER_MAX,
		}),
		deleted: countControl('Deleted members', {
			group: LIST,
			value: 1,
			max: DELETED_MEMBER_MAX,
		}),
		roles: countControl('Assignable custom roles', {
			group: LIST,
			description:
				'Custom roles the drawer offers on top of the three managed ones.',
			value: 3,
			max: CUSTOM_ROLE_MAX,
		}),
		inviteToken: choiceControl<ResetTokenState>('Invite link', {
			group: INVITES,
			description:
				"Whether the link mailed to a pending member is still good. Expired swaps the drawer's copy action for a new-link one.",
			options: RESET_TOKEN_STATES,
			value: 'valid',
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v2/users',
			response.json(() =>
				usersResponse({
					active: values.active,
					invited: values.invited,
					deleted: values.deleted,
				}),
			),
		),

		rest.post(
			'http://localhost/api/v2/users',
			response.json(() => createdUserResponse()),
		),

		rest.get(
			'http://localhost/api/v2/users/:id/reset_password_tokens',
			response.json(() => resetPasswordTokenResponse(values.inviteToken)),
		),

		rest.post(
			'http://localhost/api/v2/users/:id/reset_password_tokens',
			response.json(() => resetPasswordTokenResponse('valid')),
		),

		rest.get(
			'http://localhost/api/v2/users/:id',
			response.json((req) => userDetailResponse(String(req.params.id))),
		),

		rest.patch(
			'http://localhost/api/v2/users/:id',
			response.json(() => ({ status: 'success', data: null })),
		),

		rest.delete(
			'http://localhost/api/v2/users/:id',
			response.json(() => ({ status: 'success', data: null })),
		),

		rest.post(
			'http://localhost/api/v2/user_roles',
			response.json(() => ({ status: 'success', data: { id: 'user-role-new' } })),
		),

		rest.delete(
			'http://localhost/api/v2/user_roles/:id',
			response.json(() => ({ status: 'success', data: null })),
		),

		rest.get(
			'http://localhost/api/v1/roles',
			response.json(() => rolesListResponse(values.roles)),
		),
	],
	config: () => ({ route: ROUTES.MEMBERS_SETTINGS }),
});
