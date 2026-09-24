import { ruleTester } from './rule-tester.mjs';

const CONDITIONAL = 'Conditionally rendered text nodes with siblings';
const PRECEDED = 'Text nodes which are preceded by a conditional expression';

await ruleTester({
	rule: 'no-conditional-text-nodes-with-siblings',
	valid: [
		{
			name: 'conditional text node without siblings',
			code:
				"export const A = () => (\n\t<div>\n\t\t{flag ? 'yes' : 'no'}\n\t</div>\n);",
		},
		{
			name: 'boolean branches are not text',
			code:
				'export const A = () => (\n\t<div>\n\t\t{flag ? true : false}\n\t\t<span>x</span>\n\t</div>\n);',
		},
		{
			name: 'null branches are not text',
			code:
				'export const A = () => (\n\t<div>\n\t\t{flag ? null : null}\n\t\t<span>x</span>\n\t</div>\n);',
		},
		{
			name: 'element branches are already wrapped',
			code:
				'export const A = () => (\n\t<div>\n\t\t{flag ? <b>y</b> : <i>n</i>}\n\t\t<span>x</span>\n\t</div>\n);',
		},
		{
			name: 'text node before the conditional is safe',
			code:
				'export const A = () => (\n\t<div>\n\t\tleading text\n\t\t{flag && <b>y</b>}\n\t</div>\n);',
		},
		{
			name: 'member expression on the condition side is not rendered',
			code:
				'export const A = () => (\n\t<div>\n\t\t{obj.name && <b>y</b>}\n\t\t<span>x</span>\n\t</div>\n);',
		},
		{
			name: 'binary comparison on the condition side is not rendered',
			code:
				"export const A = () => (\n\t<div>\n\t\t{obj.name === 'x' && <b>y</b>}\n\t\t<span>x</span>\n\t</div>\n);",
		},
		// An empty string renders no text node at all, so there is nothing for
		// Google Translate to wrap and nothing for React to lose. Reporting it used
		// to be the rule's most common false positive.
		{
			name: 'element branch with an empty-string fallback',
			code:
				"export const A = () => (\n\t<div>\n\t\t{flag ? <b>Free Trial</b> : ''}\n\t\t<span>s</span>\n\t</div>\n);",
		},
		{
			name: 'both branches empty',
			code:
				"export const A = () => (\n\t<div>\n\t\t{flag ? '' : ''}\n\t\t<span>s</span>\n\t</div>\n);",
		},
		{
			name: 'logical and with an empty-string right-hand side',
			code:
				"export const A = () => (\n\t<div>\n\t\t{flag && ''}\n\t\t<span>s</span>\n\t</div>\n);",
		},

		// A template literal is checked the same way as the quoted form, so `{' '}`
		// and ``{` `}`` agree.
		{
			name: 'empty template literal branch',
			code:
				"export const A = () => (\n\t<div>\n\t\t{flag ? `` : ''}\n\t\t<span>s</span>\n\t</div>\n);",
		},
		{
			name: 'whitespace-only template literal branch is skipped',
			code:
				'export const A = () => (\n\t<div>\n\t\t{flag ? ` ` : <b>x</b>}\n\t\t<span>s</span>\n\t</div>\n);',
		},
	],
	invalid: [
		{
			name: 'string literal branches with an element sibling',
			code:
				"export const A = () => (\n\t<div>\n\t\t{flag ? 'yes' : 'no'}\n\t\t<span>x</span>\n\t</div>\n);",
			errors: [
				{ message: CONDITIONAL, line: 3, column: 11 },
				{ message: CONDITIONAL, line: 3, column: 19 },
			],
			output:
				'export const A = () => (\n\t<div>\n\t\t{flag ? <span className="translate-safe">yes</span> : <span className="translate-safe">no</span>}\n\t\t<span>x</span>\n\t</div>\n);',
		},
		{
			name: 'logical and with a string right-hand side',
			code:
				"export const A = () => (\n\t<div>\n\t\t{flag && 'yes'}\n\t\t<span>x</span>\n\t</div>\n);",
			errors: [{ message: CONDITIONAL, line: 3, column: 12 }],
		},
		{
			name: 'numeric literals render as text',
			code:
				'export const A = () => (\n\t<div>\n\t\t{flag ? 1 : 2}\n\t\t<span>x</span>\n\t</div>\n);',
			errors: [
				{ message: CONDITIONAL, line: 3, column: 11 },
				{ message: CONDITIONAL, line: 3, column: 15 },
			],
			output:
				'export const A = () => (\n\t<div>\n\t\t{flag ? <span className="translate-safe">{1}</span> : <span className="translate-safe">{2}</span>}\n\t\t<span>x</span>\n\t</div>\n);',
		},
		{
			name: 'template literal branch',
			code:
				"export const A = () => (\n\t<div>\n\t\t{flag ? `yes ${n}` : 'no'}\n\t\t<span>x</span>\n\t</div>\n);",
			errors: [
				{ message: CONDITIONAL, line: 3, column: 11 },
				{ message: CONDITIONAL, line: 3, column: 24 },
			],
			output:
				'export const A = () => (\n\t<div>\n\t\t{flag ? <span className="translate-safe">{`yes ${n}`}</span> : <span className="translate-safe">no</span>}\n\t\t<span>x</span>\n\t</div>\n);',
		},
		{
			name: 'member expression branch',
			code:
				"export const A = () => (\n\t<div>\n\t\t{flag ? obj.name : 'no'}\n\t\t<span>x</span>\n\t</div>\n);",
			errors: [
				{ message: CONDITIONAL, line: 3, column: 11 },
				{ message: CONDITIONAL, line: 3, column: 22 },
			],
			output:
				'export const A = () => (\n\t<div>\n\t\t{flag ? <span className="translate-safe">{obj.name}</span> : <span className="translate-safe">no</span>}\n\t\t<span>x</span>\n\t</div>\n);',
		},
		{
			name: 'a string needing escapes stays inside braces',
			code:
				'export const A = () => (\n\t<div>\n\t\t{flag ? "it\'s" : <b>x</b>}\n\t\t<span>s</span>\n\t</div>\n);',
			errors: [{ message: CONDITIONAL, line: 3, column: 11 }],
			output:
				'export const A = () => (\n\t<div>\n\t\t{flag ? <span className="translate-safe">{"it\'s"}</span> : <b>x</b>}\n\t\t<span>s</span>\n\t</div>\n);',
		},
		{
			name: 'optional chaining branch',
			code:
				"export const A = () => (\n\t<div>\n\t\t{flag ? obj?.deep?.name : 'no'}\n\t\t<span>x</span>\n\t</div>\n);",
			errors: [
				{ message: CONDITIONAL, line: 3, column: 11 },
				{ message: CONDITIONAL, line: 3, column: 29 },
			],
		},
		{
			name: 'nested ternary reports every text branch',
			code:
				"export const A = () => (\n\t<div>\n\t\t{a ? (b ? 'x' : 'y') : 'z'}\n\t\t<span>s</span>\n\t</div>\n);",
			errors: [
				{ message: CONDITIONAL, line: 3, column: 13 },
				{ message: CONDITIONAL, line: 3, column: 19 },
				{ message: CONDITIONAL, line: 3, column: 26 },
			],
		},
		{
			name: 'static text following a conditional',
			code:
				'export const A = () => (\n\t<div>\n\t\t{flag && <b>y</b>}\n\t\ttrailing text\n\t</div>\n);',
			errors: [{ message: PRECEDED, line: 3, column: 21 }],
			// Only the visible run is wrapped; the surrounding newlines and tabs are
			// formatting and must stay outside the element.
			output:
				'export const A = () => (\n\t<div>\n\t\t{flag && <b>y</b>}\n\t\t<span className="translate-safe">trailing text</span>\n\t</div>\n);',
		},
		{
			name: 'conditional text plus trailing static text reports both kinds',
			code:
				"export const A = () => (\n\t<div>\n\t\t{flag ? 'a' : 'b'}\n\t\tliteral tail\n\t</div>\n);",
			errors: [
				{ message: CONDITIONAL, line: 3, column: 11 },
				{ message: CONDITIONAL, line: 3, column: 17 },
				{ message: PRECEDED, line: 3, column: 21 },
			],
		},

		// The callee allowlist below is the untyped fallback. Without type
		// information the rule can only recognise known string-returning helpers,
		// so `t()` and `formatMessage()` are reported while an arbitrary call is
		// not. These cases pin that boundary.
		{
			name: 't() branch is reported via the callee allowlist',
			code:
				"export const A = () => (\n\t<div>\n\t\t{flag ? t('key') : 'no'}\n\t\t<span>x</span>\n\t</div>\n);",
			errors: [
				{ message: CONDITIONAL, line: 3, column: 11 },
				{ message: CONDITIONAL, line: 3, column: 22 },
			],
		},
		{
			name: 'formatMessage() branch is reported via the callee allowlist',
			code:
				"export const A = () => (\n\t<div>\n\t\t{flag ? formatMessage({id:'k'}) : 'no'}\n\t\t<span>x</span>\n\t</div>\n);",
			errors: [
				{ message: CONDITIONAL, line: 3, column: 11 },
				{ message: CONDITIONAL, line: 3, column: 37 },
			],
		},
		{
			name: 'arbitrary call is not recognised, only the literal branch reports',
			code:
				"export const A = () => (\n\t<div>\n\t\t{flag ? getString() : 'no'}\n\t\t<span>x</span>\n\t</div>\n);",
			errors: [{ message: CONDITIONAL, line: 3, column: 25 }],
		},
		{
			name: 'bare identifier is not recognised, only the literal branch reports',
			code:
				"export const A = () => (\n\t<div>\n\t\t{flag ? name : 'no'}\n\t\t<span>x</span>\n\t</div>\n);",
			errors: [{ message: CONDITIONAL, line: 3, column: 18 }],
		},
		{
			name: 'toString() branch is reported',
			code:
				"export const A = () => (\n\t<div>\n\t\t{flag ? val.toString() : 'no'}\n\t\t<span>x</span>\n\t</div>\n);",
			errors: [
				{ message: CONDITIONAL, line: 3, column: 11 },
				{ message: CONDITIONAL, line: 3, column: 28 },
			],
		},
		{
			name: 'toLocaleString() branch is reported',
			code:
				"export const A = () => (\n\t<div>\n\t\t{flag ? val.toLocaleString() : 'no'}\n\t\t<span>x</span>\n\t</div>\n);",
			errors: [
				{ message: CONDITIONAL, line: 3, column: 11 },
				{ message: CONDITIONAL, line: 3, column: 34 },
			],
		},
		{
			name: 't() in its own container following a conditional',
			code:
				"export const A = () => (\n\t<div>\n\t\t{flag && <b>y</b>}\n\t\t{t('key')}\n\t</div>\n);",
			errors: [{ message: PRECEDED, line: 4, column: 4 }],
		},
		{
			name: 'toString() in its own container following a conditional',
			code:
				'export const A = () => (\n\t<div>\n\t\t{flag && <b>y</b>}\n\t\t{val.toString()}\n\t</div>\n);',
			errors: [{ message: PRECEDED, line: 4, column: 4 }],
			// The whole container is replaced, so the result is not `{<span>{…}</span>}`.
			output:
				'export const A = () => (\n\t<div>\n\t\t{flag && <b>y</b>}\n\t\t<span className="translate-safe">{val.toString()}</span>\n\t</div>\n);',
		},
		{
			name: 'whitespace-only string branch is skipped, the other branch reports',
			code:
				"export const A = () => (\n\t<div>\n\t\t{flag ? ' ' : 'x'}\n\t\t<span>s</span>\n\t</div>\n);",
			errors: [{ message: CONDITIONAL, line: 3, column: 17 }],
		},
		{
			name: 'template literal holding an expression is not blank',
			code:
				'export const A = () => (\n\t<div>\n\t\t{flag ? `${n}` : <b>x</b>}\n\t\t<span>s</span>\n\t</div>\n);',
			errors: [{ message: CONDITIONAL, line: 3, column: 11 }],
		},

		// Upstream resolves branch types through `@typescript-eslint/utils` and
		// reports anything typed `string` or `number`. oxlint's JS plugin runtime
		// exposes no type information, so those paths were dropped and only the
		// callee allowlist remains. Kept as todos: if oxlint ever hands types to JS
		// plugins these become the acceptance criteria.
		{
			todo: 'needs type information to know the call returns a string',
			name: 'TYPE-AWARE: call returning a string',
			code:
				"export const A = () => (\n\t<div>\n\t\t{flag ? getString() : 'no'}\n\t\t<span>x</span>\n\t</div>\n);",
			errors: [
				{ message: CONDITIONAL, line: 3, column: 11 },
				{ message: CONDITIONAL, line: 3, column: 25 },
			],
		},
		{
			todo: 'needs type information to know the identifier is a string',
			name: 'TYPE-AWARE: identifier holding a string',
			code:
				"export const A = () => (\n\t<div>\n\t\t{flag ? name : 'no'}\n\t\t<span>x</span>\n\t</div>\n);",
			errors: [
				{ message: CONDITIONAL, line: 3, column: 11 },
				{ message: CONDITIONAL, line: 3, column: 18 },
			],
		},
		{
			todo: 'needs type information to know the identifier is a string',
			name: 'TYPE-AWARE: string identifier following a conditional',
			code:
				'export const A = () => (\n\t<div>\n\t\t{flag && <b>y</b>}\n\t\t{label}\n\t</div>\n);',
			errors: [{ message: PRECEDED, line: 4, column: 4 }],
		},

		// `isChildOfJSXElement` matches only `JSXElement`, so a fragment parent is
		// never inspected. The Google Translate failure does not care whether the
		// parent is an element or a fragment.
		{
			todo: 'fragment parents are never inspected',
			name: 'GAP: conditional text with a sibling inside a fragment',
			code:
				"export const A = () => (\n\t<>\n\t\t{flag ? 'yes' : 'no'}\n\t\t<span>x</span>\n\t</>\n);",
			errors: [
				{ message: CONDITIONAL, line: 3, column: 11 },
				{ message: CONDITIONAL, line: 3, column: 19 },
			],
		},
	],
});
