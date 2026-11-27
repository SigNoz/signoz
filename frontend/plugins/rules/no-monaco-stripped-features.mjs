/**
 * Rule: no-monaco-stripped-features
 *
 * The production build drops the Monaco contributions listed in
 * plugins/rules/shared/monaco-stripped-features.mjs. Dev and Storybook still carry them,
 * so a provider or option for one of them works there and silently does nothing
 * in production. This rule reports them, plus value imports of `monaco-editor`
 * outside src/lib/monaco: the package entry registers every language and worker.
 *
 * src/lib/monaco is allowlisted via overrides in .oxlintrc.json.
 */

import { MONACO_STRIPPED_FEATURES } from './shared/monaco-stripped-features.mjs';

const featureByApi = new Map();
const featureByOption = new Map();
for (const [feature, { providers = [], options = [] }] of Object.entries(
	MONACO_STRIPPED_FEATURES,
)) {
	providers.forEach((name) => featureByApi.set(name, feature));
	options.forEach((name) => featureByOption.set(name, feature));
}

function isMonacoSource(value) {
	return value === 'monaco-editor' || value.startsWith('monaco-editor/');
}

function isTypeOnlyImport(node) {
	return (
		node.importKind === 'type' ||
		(node.specifiers.length > 0 &&
			node.specifiers.every((s) => s.importKind === 'type'))
	);
}

function propertyName(node) {
	if (node.type === 'Identifier') {
		return node.name;
	}
	if (node.type === 'Literal' && typeof node.value === 'string') {
		return node.value;
	}
	return null;
}

function isDisabledValue(node) {
	return (
		node.type === 'Literal' && (node.value === false || node.value === 'off')
	);
}

export default {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow Monaco features the production build strips, and value imports of monaco-editor outside src/lib/monaco',
			category: 'Monaco',
		},
		schema: [],
		messages: {
			provider:
				'{{name}} needs the Monaco `{{feature}}` contribution, which the production build strips, so it works in dev and does nothing in production. Remove `{{feature}}` from plugins/rules/shared/monaco-stripped-features.mjs to use it.',
			option:
				'`{{name}}` needs the Monaco `{{feature}}` contribution, which the production build strips, so it works in dev and does nothing in production. Remove `{{feature}}` from plugins/rules/shared/monaco-stripped-features.mjs to use it.',
			import:
				'Import Monaco from lib/monaco/setup, not monaco-editor: the package entry registers every language and worker. Type-only imports are fine.',
		},
	},

	create(context) {
		const reportSource = (source) => {
			if (
				source?.type === 'Literal' &&
				typeof source.value === 'string' &&
				isMonacoSource(source.value)
			) {
				context.report({ node: source, messageId: 'import' });
			}
		};

		return {
			ImportDeclaration(node) {
				if (!isTypeOnlyImport(node)) {
					reportSource(node.source);
				}
			},
			ImportExpression: (node) => reportSource(node.source),
			ExportAllDeclaration(node) {
				if (node.exportKind !== 'type') {
					reportSource(node.source);
				}
			},
			ExportNamedDeclaration(node) {
				if (node.exportKind !== 'type') {
					reportSource(node.source);
				}
			},
			CallExpression(node) {
				const { callee } = node;
				if (callee.type === 'Identifier' && callee.name === 'require') {
					reportSource(node.arguments[0]);
					return;
				}
				const name =
					callee.type === 'MemberExpression'
						? propertyName(callee.property)
						: callee.type === 'Identifier'
							? callee.name
							: null;
				if (name !== null && featureByApi.has(name)) {
					context.report({
						node: callee,
						messageId: 'provider',
						data: { name, feature: featureByApi.get(name) },
					});
				}
			},
			Property(node) {
				if (node.computed) {
					return;
				}
				const name = propertyName(node.key);
				if (
					name !== null &&
					featureByOption.has(name) &&
					!isDisabledValue(node.value)
				) {
					context.report({
						node: node.key,
						messageId: 'option',
						data: { name, feature: featureByOption.get(name) },
					});
				}
			},
		};
	},
};
