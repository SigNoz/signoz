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
	PERMISSION_BREADTHS,
	type PermissionBreadth,
	roleResponse,
} from '../../__story_mockdata__/roles';

const EDITOR = 'Role editor · editor';

const MODES = ['create', 'edit'] as const;

type Mode = (typeof MODES)[number];

const EDITORS = ['interactive', 'json'] as const;

type Editor = (typeof EDITORS)[number];

const CUSTOM_ROLE_NAME = 'oncall-responder';

/**
 * Create and edit are the same page on two routes: `roles/new` reads as create,
 * anything else as an edit of the role in the pathname.
 */
const routeFor = (mode: Mode, editor: Editor): string => {
	const search = `viewMode=${editor}`;

	return mode === 'create'
		? `${ROUTES.ROLE_CREATE}?${search}`
		: `${ROUTES.ROLE_EDIT.replace(':roleId', CUSTOM_ROLE_ID)}?name=${CUSTOM_ROLE_NAME}&${search}`;
};

export const roleEditorMocks = defineStoryMocks({
	controls: {
		mode: choiceControl<Mode>('Mode', {
			group: EDITOR,
			description:
				'Whether the page is writing a new role or changing one that exists. Create starts from nothing and asks for a name.',
			options: MODES,
			value: 'create',
		}),
		editor: choiceControl<Editor>('Editor', {
			group: EDITOR,
			description:
				'The permission editor: resource cards, or the JSON the API stores.',
			options: EDITORS,
			value: 'interactive',
		}),
		grants: choiceControl<PermissionBreadth>('Granted permissions', {
			group: EDITOR,
			description: 'What the edited role already grants. Ignored while creating.',
			options: PERMISSION_BREADTHS,
			value: 'broad',
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v1/roles/:id',
			response.json((req) =>
				roleResponse(String(req.params.id), RoleType.CUSTOM, values.grants),
			),
		),

		rest.post(
			'http://localhost/api/v1/roles',
			response.json(() => ({ status: 'success', data: { id: CUSTOM_ROLE_ID } })),
		),

		rest.put(
			'http://localhost/api/v1/roles/:id',
			response.json(() => ({ status: 'success', data: null })),
		),
	],
	config: (values) => ({ route: routeFor(values.mode, values.editor) }),
});
