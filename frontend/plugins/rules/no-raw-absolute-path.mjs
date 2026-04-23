/**
 * Rule: no-raw-absolute-path
 *
 * Catches patterns that break at runtime when the app is served from a
 * sub-path (e.g. /signoz/):
 *
 *   1. window.open(path, '_blank')
 *      → use openInNewTab(path) which calls withBasePath internally
 *
 *   2. window.location.origin + path  /  `${window.location.origin}${path}`
 *      → use getAbsoluteUrl(path)
 *
 *   3. frontendBaseUrl: window.location.origin  (bare origin usage)
 *      → use getBaseUrl() to include the base path
 *
 *   4. window.location.href = path
 *      → use withBasePath(path) or navigate() for internal navigation
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

function isHrefAccess(node) {
	return (
		node.type === 'MemberExpression' &&
		!node.computed &&
		node.property.name === 'href' &&
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


// window.open(withBasePath(x)) and window.open(getAbsoluteUrl(x)) are already safe.
function isSafeHelperCall(node) {
	return (
		node.type === 'CallExpression' &&
		node.callee.type === 'Identifier' &&
		(node.callee.name === 'withBasePath' || node.callee.name === 'getAbsoluteUrl')
	);
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
			originDirect:
				'Use getBaseUrl() instead of window.location.origin — getBaseUrl includes the base path.',
			hrefAssign:
				'Use withBasePath(path) or navigate() instead of window.location.href = path — ensures the base path is included.',
		},
	},

	create(context) {
		return {
			// window.open(path, ...) — allow only external first-arg URLs
			CallExpression(node) {
				const { callee, arguments: args } = node;
				if (
					callee.type !== 'MemberExpression' ||
					callee.object.type !== 'Identifier' ||
					callee.object.name !== 'window' ||
					callee.property.name !== 'open'
				)
					{return;}
				if (args.length === 0) {return;}
				if (isExternalUrl(args[0])) {return;}
				if (isSafeHelperCall(args[0])) {return;}

				context.report({ node, messageId: 'windowOpen' });
			},

			// window.location.origin + path
			BinaryExpression(node) {
				if (node.operator !== '+') {return;}
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

			// window.location.origin used directly (not in concatenation)
			// Catches: frontendBaseUrl: window.location.origin
			MemberExpression(node) {
				if (!isOriginAccess(node)) {return;}

				const parent = node.parent;
				// Skip if parent is BinaryExpression with + (handled by BinaryExpression visitor)
				if (parent.type === 'BinaryExpression' && parent.operator === '+') {return;}
				// Skip if inside TemplateLiteral (handled by TemplateLiteral visitor)
				if (parent.type === 'TemplateLiteral') {return;}

				context.report({ node, messageId: 'originDirect' });
			},

			// window.location.href = path
			AssignmentExpression(node) {
				if (node.operator !== '=') {return;}
				if (!isHrefAccess(node.left)) {return;}

				// Allow external URLs
				if (isExternalUrl(node.right)) {return;}
				// Allow safe helper calls
				if (isSafeHelperCall(node.right)) {return;}

				context.report({ node, messageId: 'hrefAssign' });
			},
		};
	},
};
