/**
 * Rule: no-conditional-text-nodes-with-siblings
 *
 * Conditionally rendered text nodes with siblings should be wrapped in an
 * element (for example a `<span>`), otherwise Google Translate causes a browser
 * error. Translate replaces the text node with a `<font>` wrapper, React still
 * holds a reference to the original node, and the next render throws on
 * `removeChild`.
 *
 * Adapted from https://github.com/getcouped/eslint-plugin-react-google-translate
 * (v1.0.4). The upstream rule resolves branch types through
 * `@typescript-eslint/utils`; oxlint's JS plugin runtime exposes no type
 * information, so those paths are dropped and call expressions are matched
 * against the allowlist below instead.
 */

// Calls known to render as text. Without types this is the only way to
// recognise a string-returning call; widen it to catch more helpers.
const TEXT_RETURNING_CALLEES = new Set(['formatMessage', 't']);
const STRINGIFY_METHODS = new Set(['toString', 'toLocaleString']);

function calleeName(node) {
	return node.type === 'Identifier' ? node.name : null;
}

function isTextReturningCall(node) {
	const { callee } = node;

	if (TEXT_RETURNING_CALLEES.has(calleeName(callee))) {
		return node.arguments.length > 0;
	}

	if (callee.type === 'MemberExpression' && !callee.computed) {
		return STRINGIFY_METHODS.has(calleeName(callee.property));
	}

	return STRINGIFY_METHODS.has(calleeName(callee));
}

/**
 * True when the node renders no visible text. An empty or whitespace-only value
 * produces no DOM text node, so Google Translate has nothing to wrap and React
 * nothing to lose.
 */
function isBlankText(node) {
	if (node.type === 'Literal' || node.type === 'JSXText') {
		return typeof node.value === 'string' && node.value.trim() === '';
	}
	if (node.type === 'TemplateLiteral') {
		return (
			node.expressions.length === 0 &&
			node.quasis.every((quasi) => (quasi.value.cooked ?? '').trim() === '')
		);
	}
	return false;
}

function isConditionallyRendered(node) {
	const parent = node.parent;
	return (
		parent?.type === 'ConditionalExpression' ||
		parent?.type === 'LogicalExpression'
	);
}

function isRenderedConditional(node) {
	return (
		node.type === 'JSXExpressionContainer' &&
		(node.expression?.type === 'ConditionalExpression' ||
			node.expression?.type === 'LogicalExpression')
	);
}

/** Children that produce output, i.e. everything but formatting whitespace. */
function renderedChildren(node) {
	const children = node?.children;
	if (!children) {
		return null;
	}
	return children.filter((child) => !isBlankText(child));
}

/** True when `node` is a JSX child rendered alongside at least one other child. */
function hasSiblings(node) {
	if (!(node?.parent?.children?.length > 1)) {
		return false;
	}
	return renderedChildren(node.parent).some((child) => child !== node);
}

function isPrecededByConditional(node) {
	const children = renderedChildren(node?.parent);
	if (!children) {
		return false;
	}
	return children.some(
		(child) => child.start < node.start && isRenderedConditional(child),
	);
}

/** Walk out of nested conditionals so nested branches report against the outer container. */
function getOutermostConditional(node) {
	let current = node;
	while (isConditionallyRendered(current)) {
		current = current.parent;
	}
	return current;
}

/** True when `node` is a conditional branch rendered directly beside other JSX children. */
function isProblematicConditional(node) {
	if (!isConditionallyRendered(node)) {
		return false;
	}

	const container = getOutermostConditional(node);
	return (
		container.parent?.type === 'JSXExpressionContainer' &&
		container.parent.parent?.type === 'JSXElement' &&
		hasSiblings(container.parent)
	);
}

/** True when `node` renders after a sibling conditional, i.e. the DOM order Translate breaks. */
function followsConditionalSibling(node) {
	return (
		node.parent?.parent?.type === 'JSXElement' &&
		hasSiblings(node.parent) &&
		isPrecededByConditional(node.parent)
	);
}

/**
 * `A && B` and the test of a ternary are conditions, not rendered output.
 */
function isCondition(node) {
	let current = node;
	while (current.parent?.type === 'LogicalExpression') {
		if (current.parent.left === current) {
			return true;
		}
		current = current.parent;
	}
	if (current.parent?.type === 'ConditionalExpression') {
		return current.parent.test === current;
	}
	return false;
}

function isConditionOperand(node) {
	if (node.parent?.type === 'BinaryExpression') {
		return isCondition(node.parent);
	}
	return isCondition(node);
}

// A string may only be inlined as JSX text when it needs no escaping and no
// whitespace of its own: JSX collapses leading and trailing whitespace, and
// these characters would either close the element or start an entity.
const NEEDS_BRACES = /['"{}<>&\r\n]/;

// `display: contents`, declared in src/styles.scss. React owns the element so
// Translate's `<font>` swap is absorbed, while the box tree stays as it was and
// a flex or grid parent still sees one contiguous text run.
const OPEN = '<span className="translate-safe">';
const CLOSE = '</span>';

/** Wraps the reported expression so React owns an element Translate cannot replace. */
function wrapExpression(fixer, sourceCode, node) {
	// A call reported on its own already sits in a container. Replacing the
	// container yields `<span …>{expr}</span>` rather than `{<span …>{expr}</span>}`.
	const target =
		node.parent?.type === 'JSXExpressionContainer' ? node.parent : node;

	if (
		node.type === 'Literal' &&
		typeof node.value === 'string' &&
		!NEEDS_BRACES.test(node.value) &&
		node.value.trim() === node.value
	) {
		return fixer.replaceText(target, `${OPEN}${node.value}${CLOSE}`);
	}

	return fixer.replaceText(
		target,
		`${OPEN}{${sourceCode.getText(node)}}${CLOSE}`,
	);
}

/**
 * Wraps static JSX text. Only the visible run is wrapped: the node also spans
 * the formatting whitespace around it, which has to stay outside the element.
 */
function wrapJsxText(fixer, node) {
	const raw = node.value;
	const leading = raw.length - raw.trimStart().length;
	const trailing = raw.length - raw.trimEnd().length;
	return fixer.replaceTextRange(
		[node.start + leading, node.end - trailing],
		`${OPEN}${raw.trim()}${CLOSE}`,
	);
}

export default {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Conditionally rendered text nodes should be wrapped in an element (for example a `<span>`), otherwise Google Translate can cause a browser error.',
			url: 'https://github.com/getcouped/eslint-plugin-react-google-translate#eslint-plugin-react-google-translate',
		},
		schema: [],
		// Wrapping adds a DOM element, which can turn into a flex/grid item or
		// break `> *` and `:nth-child` selectors, so it is offered as a suggestion
		// (`--fix-suggestions`) rather than applied by a bare `--fix`.
		hasSuggestions: true,
		messages: {
			'conditional-text-node':
				'Conditionally rendered text nodes with siblings, rendered as a direct child of a JSX element, must be wrapped so Google Translate cannot break React\'s DOM: `<span className="translate-safe">{value}</span>`. Translate replaces the bare text node with a `<font>` element and React then throws on `removeChild`. This also applies to values returned from functions, so `getString()` becomes `<span className="translate-safe">{getString()}</span>`.',
			'text-node-preceded-by-conditional':
				'Text nodes which are preceded by a conditional expression, rendered as a direct child of a JSX element, must be wrapped so Google Translate cannot break React\'s DOM: `<span className="translate-safe">text</span>`. Translate replaces the bare text node with a `<font>` element and React then throws on `removeChild`.',
		},
	},

	createOnce(context) {
		const suggestWrap = (build) => [{ desc: 'Wrap in a <span>', fix: build }];

		const wrap = (fixer, node) => wrapExpression(fixer, context.sourceCode, node);

		const reportConditional = (node) => {
			context.report({
				node,
				messageId: 'conditional-text-node',
				suggest: suggestWrap((fixer) => wrap(fixer, node)),
			});
		};

		const reportPreceded = (node, build) => {
			context.report({
				node,
				messageId: 'text-node-preceded-by-conditional',
				suggest: suggestWrap(build),
			});
		};

		return {
			// String and numeric branches: `{flag ? 'yes' : 'no'}`
			Literal(node) {
				if (node.value === null || typeof node.value === 'boolean') {
					return;
				}
				if (isBlankText(node)) {
					return;
				}
				if (isProblematicConditional(node)) {
					reportConditional(node);
				}
			},

			TemplateLiteral(node) {
				if (isBlankText(node)) {
					return;
				}
				if (isProblematicConditional(node)) {
					reportConditional(node);
				}
			},

			// Static text rendered after a conditional: `{flag && <b/>}trailing`
			JSXText(node) {
				if (isBlankText(node)) {
					return;
				}
				if (hasSiblings(node) && isPrecededByConditional(node)) {
					reportPreceded(node, (fixer) => wrapJsxText(fixer, node));
				}
			},

			CallExpression(node) {
				if (isCondition(node) || !isTextReturningCall(node)) {
					return;
				}

				if (isProblematicConditional(node)) {
					reportConditional(node);
				}
				if (followsConditionalSibling(node)) {
					reportPreceded(node, (fixer) => wrap(fixer, node));
				}
			},

			// Values read off an object: `{flag ? user.name : 'anonymous'}`
			MemberExpression(node) {
				if (isConditionOperand(node)) {
					return;
				}
				if (isProblematicConditional(node)) {
					reportConditional(node);
				}
			},

			// Optional chaining wraps the member expression: `{flag ? a?.b?.c : 'x'}`
			ChainExpression(node) {
				if (isConditionOperand(node)) {
					return;
				}
				if (isProblematicConditional(node)) {
					reportConditional(node);
				}
			},
		};
	},
};
