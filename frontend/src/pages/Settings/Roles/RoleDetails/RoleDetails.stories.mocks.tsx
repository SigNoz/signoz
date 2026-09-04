/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';
import { RoleType } from 'types/roles';

import { choiceControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	CUSTOM_ROLE_ID,
	MANAGED_ROLE_ID,
	PERMISSION_BREADTHS,
	type PermissionBreadth,
	roleResponse,
	rolesListResponse,
} from '../../__story_mockdata__/roles';

const ROLE = 'Role details · role';

const ROLE_TYPES = [RoleType.CUSTOM, RoleType.MANAGED] as const;

/** Named after the role the route points at, which the header reads off `?name`. */
const roleFor = (type: RoleType): { id: string; name: string } =>
	type === RoleType.MANAGED
		? { id: MANAGED_ROLE_ID, name: 'admin' }
		: { id: CUSTOM_ROLE_ID, name: 'oncall-responder' };

export const roleDetailsMocks = defineStoryMocks({
	controls: {
		roleType: choiceControl<RoleType>('Role type', {
			group: ROLE,
			description:
				"A managed role is the backend's own: it can be read but not edited or deleted, so the header actions go with it.",
			options: ROLE_TYPES,
			value: RoleType.CUSTOM,
		}),
		grants: choiceControl<PermissionBreadth>('Granted permissions', {
			group: ROLE,
			description:
				'How much the role grants. `broad` covers whole resources and named subsets, `narrow` one object, `none` nothing at all.',
			options: PERMISSION_BREADTHS,
			value: 'broad',
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v1/roles/:id',
			response.json((req) =>
				roleResponse(String(req.params.id), values.roleType, values.grants),
			),
		),

		rest.delete(
			'http://localhost/api/v1/roles/:id',
			response.json(() => ({ status: 'success', data: null })),
		),

		rest.get(
			'http://localhost/api/v1/roles',
			response.json(() => rolesListResponse(4)),
		),
	],
	config: (values) => {
		const role = roleFor(values.roleType);

		return {
			route: `${ROUTES.ROLE_DETAILS.replace(':roleId', role.id)}?name=${role.name}`,
		};
	},
});
