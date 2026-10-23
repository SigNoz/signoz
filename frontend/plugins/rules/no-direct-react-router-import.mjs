/**
 * Rule: no-direct-react-router-import
 *
 * Every router concern goes through the `src/lib/router/*` facade, so a router
 * upgrade is a change to one directory instead of ~300 call sites. This rule
 * keeps new call sites, and test mocks, from reaching past it.
 *
 * `history` (the package) is deliberately not flagged: it is a transitive concern of
 * the version bump, not something the facade replaces.
 *
 * The allowlist (the facade itself, the route table, `useSafeNavigate`, the history
 * singleton and the test and story router mounts) is applied via overrides in
 * .oxlintrc.json, not here, so the file list stays visible next to the severity.
 */

import path from 'node:path';

const HISTORY_MODULE_SUFFIX = path.join('src', 'lib', 'history');

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
	'react-router': 'v5Router',
	'react-router-dom': 'v5Router',
	'react-router-dom-v5-compat': 'v6Compat',
	'lib/history': 'historySingleton',
	'@/lib/history': 'historySingleton',
};

/** Resolves `./history` / `../history` so files inside src/lib count too. */
function isHistoryModule(specifier, filename) {
	if (!specifier.startsWith('.') || !filename) {
		return false;
	}
	const resolved = path.resolve(path.dirname(filename), specifier);
	return (
		resolved.endsWith(HISTORY_MODULE_SUFFIX) ||
		resolved.endsWith(`${HISTORY_MODULE_SUFFIX}.ts`)
	);
}

function messageIdFor(specifier, filename) {
	if (MESSAGE_IDS[specifier] !== undefined) {
		return MESSAGE_IDS[specifier];
	}
	return isHistoryModule(specifier, filename) ? 'historySingleton' : null;
}

export default {
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Disallow direct react-router / lib/history imports; import from src/lib/router instead',
			category: 'React Router migration',
		},
		schema: [],
		messages: {
			v5Router:
				'Do not import react-router-dom directly. Use the src/lib/router facade (useAppNavigate, useAppLocation, useAppParams, AppLink, Redirect, matchRoute) so a router upgrade stays contained.',
			v6Compat:
				'Do not import react-router-dom-v5-compat directly. Use the src/lib/router facade instead; the compat package is an implementation detail of the migration and disappears with it.',
			historySingleton:
				'Do not import the lib/history singleton. Use the helpers in src/lib/router/navigation.ts, or useAppNavigate() to follow the nearest router. history loses basename handling once the router owns it.',
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
			const messageId = messageIdFor(sourceNode.value, context.filename);
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
