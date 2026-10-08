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
	BLOCKED_INVITE_DOMAIN,
	createdUserResponse,
	emptyResetTokenResponse,
	RESET_LINK_OUTCOMES,
	type ResetLinkOutcome,
	DELETED_MEMBER_MAX,
	INVITED_MEMBER_MAX,
	RESET_TOKEN_STATES,
	type ResetTokenState,
	resetPasswordTokenResponse,
	userDetailResponse,
	usersResponse,
} from './__story_mockdata__/members';

import {
	MUTATION_OUTCOMES,
	type MutationOutcome,
	mutationResolver,
	mutationResponse,
} from '../../stories/__story_mockdata__/mutationOutcome';
import {
	CUSTOM_ROLE_MAX,
	rolesListResponse,
} from '../../stories/__story_mockdata__/roles';

const LIST = 'Members · list';
const INVITES = 'Members · invites';
const DRAWER = 'Members · drawer';

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
		invite: choiceControl<MutationOutcome>('Sending invites', {
			group: INVITES,
			description: `How each invite answers. An address on ${BLOCKED_INVITE_DOMAIN} is always refused, which leaves a batch half sent. \`success\` raises the "Invites sent" toast, \`loading\` never answers, \`error\` refuses every invite.`,
			options: MUTATION_OUTCOMES,
			value: 'success',
		}),
		memberUpdate: choiceControl<MutationOutcome>('Saving the member', {
			group: DRAWER,
			description:
				'How the PATCH behind "Save Member Details" answers. `success` raises the "Member details updated" toast, `loading` leaves the button spinning, `error` lists the failure in the drawer.',
			options: MUTATION_OUTCOMES,
			value: 'success',
		}),
		memberDelete: choiceControl<MutationOutcome>('Deleting the member', {
			group: DRAWER,
			description:
				'How the DELETE behind the confirmation answers. `success` raises the "Member deleted" or "Invite revoked" toast, `loading` leaves the button busy, `error` opens the error modal.',
			options: MUTATION_OUTCOMES,
			value: 'success',
		}),
		resetLink: choiceControl<ResetLinkOutcome>('Generating a link', {
			group: DRAWER,
			description:
				'How the POST behind the reset or invite link answers. `success` opens the dialog whose copy button raises the toast, `no-token` raises the "Failed to generate" toast, `loading` never answers, `error` opens the error modal.',
			options: RESET_LINK_OUTCOMES,
			value: 'success',
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

		rest.post('http://localhost/api/v2/users', async (req, res, ctx) => {
			const { email } = (await req.json()) as { email?: string };

			if (String(email).endsWith(BLOCKED_INVITE_DOMAIN)) {
				return res(
					ctx.status(409),
					ctx.json({
						status: 'error',
						error: { code: 'already_exists', message: 'User already exists' },
					}),
				);
			}

			return mutationResponse(values.invite, createdUserResponse(), res, ctx);
		}),

		rest.get(
			'http://localhost/api/v2/users/:id/reset_password_tokens',
			response.json(() => resetPasswordTokenResponse(values.inviteToken)),
		),

		rest.put(
			'http://localhost/api/v2/users/:id/reset_password_tokens',
			mutationResolver(
				values.resetLink === 'no-token' ? 'success' : values.resetLink,
				values.resetLink === 'no-token'
					? emptyResetTokenResponse()
					: resetPasswordTokenResponse('valid'),
			),
		),

		rest.get(
			'http://localhost/api/v2/users/:id',
			response.json((req) => userDetailResponse(String(req.params.id))),
		),

		rest.put(
			'http://localhost/api/v2/users/:id',
			mutationResolver(values.memberUpdate),
		),

		rest.delete(
			'http://localhost/api/v2/users/:id',
			mutationResolver(values.memberDelete),
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
