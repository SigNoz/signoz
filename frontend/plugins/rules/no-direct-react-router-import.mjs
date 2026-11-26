/**
 * Rule: no-direct-react-router-import
 *
 * Every router concern goes through the `src/lib/router/*` facade, so a router
 * upgrade is a change to one directory instead of ~300 call sites. This rule
 * keeps new call sites, and test mocks, from reaching past it.
 *
 * `react-router-dom` is still flagged even though the package is gone: on v7 it is a
 * re-export shim over `react-router`, so reinstalling it would split the tree again.
 *
 * The allowlist (the facade itself, the route table, the router mount,
 * `useSafeNavigate` and the test and story router mounts) is applied via overrides
 * in .oxlintrc.json, not here, so the file list stays visible next to the severity.
 */

const JEST_MODULE_METHODS = new Set([
	'mock',
	'doMock',
	'unmock',
	'dontMock',
	'setMock',
	'requireActual',
	'requireMock',
	'createMockFromModule',
]);

const MESSAGE_IDS = {
	'react-router': 'router',
	'react-router-dom': 'routerDom',
};

function messageIdFor(specifier) {
	return MESSAGE_IDS[specifier] ?? null;
}

export default {
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Disallow direct react-router imports; import from src/lib/router instead',
			category: 'React Router migration',
		},
		schema: [],
		messages: {
			router:
				'Do not import react-router directly. Use the src/lib/router facade (useAppNavigate, useAppLocation, useAppParams, AppLink, Redirect, matchRoute) so a router upgrade stays contained.',
			routerDom:
				'Do not import react-router-dom. The app is on react-router; on v7 react-router-dom is only a re-export shim, and installing it puts two copies of the router in the tree. Use the src/lib/router facade.',
			mock:
				'Do not mock the router directly. Render at a route with tests/test-utils, or spy on the facade with the tests/router-mocks helpers.',
		},
	},

	create(context) {
		const report = (sourceNode, overrideMessageId) => {
			if (
				sourceNode === null ||
				sourceNode === undefined ||
				typeof sourceNode.value !== 'string'
			) {
				return;
			}
			const messageId = messageIdFor(sourceNode.value);
			if (messageId !== null) {
				context.report({
					node: sourceNode,
					messageId: overrideMessageId ?? messageId,
				});
			}
		};

		return {
			ImportDeclaration: (node) => report(node.source),
			ImportExpression: (node) => report(node.source),
			ExportAllDeclaration: (node) => report(node.source),
			ExportNamedDeclaration: (node) => report(node.source),
			CallExpression(node) {
				const { callee } = node;
				if (
					(callee.type === 'Identifier' && callee.name === 'require') ||
					callee.type === 'Import'
				) {
					report(node.arguments[0]);
					return;
				}
				if (
					callee.type === 'MemberExpression' &&
					callee.object.type === 'Identifier' &&
					callee.object.name === 'jest' &&
					callee.property.type === 'Identifier' &&
					JEST_MODULE_METHODS.has(callee.property.name)
				) {
					report(node.arguments[0], 'mock');
				}
			},
		};
	},
};
