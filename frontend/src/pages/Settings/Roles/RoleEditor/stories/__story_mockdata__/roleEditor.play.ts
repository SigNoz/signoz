/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { buildRoleReadPermission } from 'lib/authz/hooks/useAuthZ/permissions/role.permissions';
import { expect, waitFor, within } from 'storybook/test';

import { grantsAll } from '@/storybook/access/access';
import {
	blurActiveElement,
	findMonacoEditor,
	setMonacoText,
} from '@/storybook/play/monacoEditor';

import {
	CUSTOM_ROLE_NAME,
	type RoleEditorArgs,
} from '../RoleEditor.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: RoleEditorArgs;
}

const PAGE_LOAD = { timeout: 15_000 };

/**
 * A relation the schema's enum does not list. The JSON parses, so only schema
 * validation can flag it.
 */
const UNKNOWN_RELATION_JSON = JSON.stringify(
	[
		{
			objectGroup: {
				resource: { kind: 'dashboard', type: 'metaresource' },
				selectors: ['*'],
			},
			relation: 'approve',
		},
	],
	null,
	2,
);

const UNKNOWN_RELATION_LINE =
	UNKNOWN_RELATION_JSON.split('\n').findIndex((line) =>
		line.includes('"relation"'),
	) + 1;

/** Custom roles need a valid license, and editing one needs the role and `read` on it. */
const showsJsonEditor = (args: RoleEditorArgs): boolean =>
	args.editor === 'json' &&
	(args.license === 'cloud' || args.license === 'enterprise') &&
	(args.mode === 'create' ||
		(args.dataState === 'loaded' &&
			(args.authzState === 'error' ||
				grantsAll(args, buildRoleReadPermission(CUSTOM_ROLE_NAME)))));

const findJsonEditor = async ({
	canvasElement,
}: PlayContext): Promise<HTMLElement> => {
	const editor = await within(canvasElement).findByTestId(
		'json-editor',
		undefined,
		PAGE_LOAD,
	);

	await findMonacoEditor(editor);

	return editor;
};

export const showJsonEditor = async (context: PlayContext): Promise<void> => {
	if (!showsJsonEditor(context.args)) {
		return;
	}

	await findJsonEditor(context);
	blurActiveElement();
};

export const enterUnknownRelation = async (
	context: PlayContext,
): Promise<void> => {
	if (!showsJsonEditor(context.args)) {
		return;
	}

	const editor = await findJsonEditor(context);

	await setMonacoText('json', UNKNOWN_RELATION_JSON);
	await findMonacoEditor(editor, 'approve');
	await waitFor(
		() =>
			expect(
				within(editor).getByTestId('json-editor-schema-error'),
			).toHaveTextContent(`Line ${UNKNOWN_RELATION_LINE}:`),
		PAGE_LOAD,
	);
	blurActiveElement();
};
