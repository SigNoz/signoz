/**
 * Rule: no-msw-in-story-file
 *
 * A `.stories.tsx` file is the human-facing surface: it must not carry msw
 * handlers or response payloads. Those belong in the sibling
 * `<Page>.stories.mocks.tsx` module (and its `__story_mockdata__` builders).
 *
 * This rule flags any import from `msw` inside a `*.stories.tsx` file. It
 * does not match `*.stories.mocks.tsx`, which is where msw imports belong.
 */

export default {
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Disallow importing from msw inside a .stories.tsx file; move handlers/mock data to the sibling .stories.mocks.tsx module',
			category: 'Storybook',
		},
		schema: [],
		messages: {
			noMsw:
				'Do not import from msw in a .stories.tsx file. Move the handler and its mock data to the sibling <Page>.stories.mocks.tsx module (and __story_mockdata__ for builders).',
		},
	},

	create(context) {
		const filename = context.filename || '';
		if (!filename.endsWith('.stories.tsx')) {
			return {};
		}

		return {
			ImportDeclaration(node) {
				if (node.source.value === 'msw') {
					context.report({ node, messageId: 'noMsw' });
				}
			},
		};
	},
};
