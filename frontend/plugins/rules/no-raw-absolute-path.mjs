/**
 * Rule: no-raw-absolute-path
 *
 * Catches two patterns that break at runtime when the app is served from a
 * sub-path (e.g. /signoz/):
 *
 *   1. window.open(path, '_blank')
 *      → use openInNewTab(path) which calls withBasePath internally
 *
 *   2. window.location.origin + path  /  `${window.location.origin}${path}`
 *      → use getAbsoluteUrl(path)
 *
 * External URLs (first arg starts with "http") are explicitly allowed.
 */

function isOriginAccess(node) {
	return (
		node.type === 'MemberExpression' &&
		!node.computed &&
		node.property.name === 'origin' &&
		node.object.type === 'MemberExpression' &&
		!node.object.computed &&
		node.object.property.name === 'location' &&
		node.object.object.type === 'Identifier' &&
		node.object.object.name === 'window'
	);
}

function isExternalUrl(node) {
	if (node.type === 'Literal' && typeof node.value === 'string') {
		return node.value.startsWith('http://') || node.value.startsWith('https://');
	}
	if (node.type === 'TemplateLiteral' && node.quasis.length > 0) {
		const raw = node.quasis[0].value.raw;
		return raw.startsWith('http://') || raw.startsWith('https://');
	}
	return false;
}

export default {
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Disallow raw window.open and origin-concatenation patterns that miss the runtime base path',
			category: 'Base Path Safety',
		},
		schema: [],
		messages: {
			windowOpen:
				'Use openInNewTab(path) instead of window.open(path, "_blank") — openInNewTab prepends the base path automatically.',
			originConcat:
				'Use getAbsoluteUrl(path) instead of window.location.origin + path — getAbsoluteUrl prepends the base path automatically.',
		},
	},

	create(context) {
		return {
			// window.open(path, '_blank') — allow only external string literals
			CallExpression(node) {
				const { callee, arguments: args } = node;
				if (
					callee.type !== 'MemberExpression' ||
					callee.object.type !== 'Identifier' ||
					callee.object.name !== 'window' ||
					callee.property.name !== 'open'
				)
					return;
				if (args.length < 2) return;
				if (args[1].type !== 'Literal' || args[1].value !== '_blank') return;
				if (isExternalUrl(args[0])) return;

				context.report({ node, messageId: 'windowOpen' });
			},

			// window.location.origin + path
			BinaryExpression(node) {
				if (node.operator !== '+') return;
				if (isOriginAccess(node.left) || isOriginAccess(node.right)) {
					context.report({ node, messageId: 'originConcat' });
				}
			},

			// `${window.location.origin}${path}`
			TemplateLiteral(node) {
				if (node.expressions.some(isOriginAccess)) {
					context.report({ node, messageId: 'originConcat' });
				}
			},
		};
	},
};
