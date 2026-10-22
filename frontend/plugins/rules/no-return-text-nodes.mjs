/**
 * Rule: no-return-text-nodes
 *
 * React components should not return a bare text node. Google Translate keeps
 * displaying the stale translated text after a state change and nothing throws,
 * which makes the bug very hard to track down. Numbers count too: JSX renders
 * them as text.
 *
 * Adapted from https://github.com/getcouped/eslint-plugin-react-google-translate
 * (v1.0.4). Upstream walks the function body statement by statement; this
 * version visits `ReturnStatement` directly and walks up to the enclosing
 * function, which covers the same constructs without enumerating them.
 */

const FUNCTION_TYPES = new Set([
	'FunctionDeclaration',
	'FunctionExpression',
	'ArrowFunctionExpression',
]);

function isTextNode(node) {
	if (!node) {
		return false;
	}
	if (node.type === 'TemplateLiteral') {
		return true;
	}
	return (
		node.type === 'Literal' &&
		(typeof node.value === 'string' || typeof node.value === 'number')
	);
}

function getEnclosingFunction(node) {
	let current = node.parent;
	while (current) {
		if (FUNCTION_TYPES.has(current.type)) {
			return current;
		}
		current = current.parent;
	}
	return null;
}

function isComponentName(name) {
	return (
		typeof name === 'string' && name !== '' && name[0] === name[0].toUpperCase()
	);
}

// The suggestion introduces JSX, which only parses in a JSX-enabled file.
function allowsJsx(filename) {
	return filename.endsWith('.tsx') || filename.endsWith('.jsx');
}

export default {
	meta: {
		type: 'problem',
		docs: {
			description:
				'React components should avoid returning text nodes directly (or numerical values which will be rendered as text). When a React component returns values other than JSX / null, Google Translate can continue to display stale values after state changes, without any error being thrown. Since this is very hard to debug it is better to avoid it altogether.',
			url: 'https://github.com/getcouped/eslint-plugin-react-google-translate#eslint-plugin-react-google-translate',
		},
		schema: [],
		// Wrapping changes what the component renders, so it is offered as a
		// suggestion (`--fix-suggestions`) rather than applied by a bare `--fix`.
		hasSuggestions: true,
		messages: {
			'return-value-is-text-node':
				'React components should avoid returning text nodes directly (or numerical values which will be rendered as text). When a React component returns values other than JSX / null, Google Translate can continue to display stale values after state changes, without any error being thrown. Since this is very hard to debug it is better to avoid it altogether.',
		},
	},

	createOnce(context) {
		const buildSuggestion = (node) => {
			if (!allowsJsx(context.filename)) {
				return undefined;
			}
			return [
				{
					desc: 'Wrap in a <span>',
					fix: (fixer) =>
						fixer.replaceText(
							node.argument,
							`<span className="translate-safe">{${context.sourceCode.getText(node.argument)}}</span>`,
						),
				},
			];
		};

		return {
			ReturnStatement(node) {
				if (!isTextNode(node.argument)) {
					return;
				}

				// Only named function declarations are recognised as components, so a
				// text return from a nested helper or a class method is left alone.
				const fn = getEnclosingFunction(node);
				if (fn?.type !== 'FunctionDeclaration') {
					return;
				}
				if (!isComponentName(fn.id?.name)) {
					return;
				}

				context.report({
					node,
					messageId: 'return-value-is-text-node',
					suggest: buildSuggestion(node),
				});
			},
		};
	},
};
