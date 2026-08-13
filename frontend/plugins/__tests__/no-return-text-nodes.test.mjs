import { ruleTester } from './rule-tester.mjs';

const RETURNS_TEXT = 'React components should avoid returning text nodes';

await ruleTester({
	rule: 'no-return-text-nodes',
	valid: [
		{
			name: 'lowercase function is not a component',
			code: "export function foo() {\n\treturn 'text';\n}",
		},
		{
			name: 'returning JSX',
			code: 'export function Foo() {\n\treturn <div>hi</div>;\n}',
		},
		{
			name: 'returning null',
			code: 'export function Foo() {\n\treturn null;\n}',
		},
		{
			name: 'returning boolean',
			code: 'export function Foo() {\n\treturn true;\n}',
		},
		{ name: 'bare return', code: 'export function Foo() {\n\treturn;\n}' },
		{
			name: 'returning a variable is not a literal',
			code: "export function Foo() {\n\tconst s = 'x';\n\treturn s;\n}",
		},
		{
			name: 'lowercase nested function inside a component',
			code:
				"export function Foo() {\n\tfunction helper() {\n\t\treturn 'x';\n\t}\n\treturn <div/>;\n}",
		},

		{
			// The repo has no class components, so this is out of scope rather than
			// a gap worth closing.
			name: 'class method',
			code: "export class Foo {\n\trender() {\n\t\treturn 'text';\n\t}\n}",
		},
	],
	invalid: [
		{
			name: 'string literal',
			code: "export function Foo() {\n\treturn 'text';\n}",
			errors: [{ message: RETURNS_TEXT, line: 2, column: 2 }],
			output:
				'export function Foo() {\n\treturn <span className="translate-safe">{\'text\'}</span>;\n}',
		},
		{
			// JSX does not parse in a `.ts` file, so no suggestion is offered there.
			name: 'string literal in a non-JSX file',
			filename: 'case.ts',
			code: "export function Foo() {\n\treturn 'text';\n}",
			errors: [{ message: RETURNS_TEXT, line: 2, column: 2 }],
			output: "export function Foo() {\n\treturn 'text';\n}",
		},
		{
			name: 'numeric literal',
			code: 'export function Foo() {\n\treturn 42;\n}',
			errors: [{ message: RETURNS_TEXT, line: 2, column: 2 }],
		},
		{
			name: 'template literal',
			code: 'export function Foo() {\n\treturn `text ${x}`;\n}',
			errors: [{ message: RETURNS_TEXT, line: 2, column: 2 }],
		},
		{
			name: 'inside an if consequent',
			code:
				"export function Foo() {\n\tif (a) {\n\t\treturn 'x';\n\t}\n\treturn <div/>;\n}",
			errors: [{ message: RETURNS_TEXT, line: 3, column: 3 }],
		},
		{
			name: 'inside an else block',
			code:
				"export function Foo() {\n\tif (a) {\n\t\treturn <div/>;\n\t} else {\n\t\treturn 'x';\n\t}\n}",
			errors: [{ message: RETURNS_TEXT, line: 5, column: 3 }],
		},
		{
			name: 'inside an else-if chain',
			code:
				"export function Foo() {\n\tif (a) {\n\t\treturn <div/>;\n\t} else if (b) {\n\t\treturn 'x';\n\t}\n\treturn null;\n}",
			errors: [{ message: RETURNS_TEXT, line: 5, column: 3 }],
		},
		{
			name: 'inside a switch case',
			code:
				"export function Foo() {\n\tswitch (a) {\n\t\tcase 1:\n\t\t\treturn 'x';\n\t\tdefault:\n\t\t\treturn <div/>;\n\t}\n}",
			errors: [{ message: RETURNS_TEXT, line: 4, column: 4 }],
		},
		{
			name: 'inside try, catch and finally',
			code:
				"export function Foo() {\n\ttry {\n\t\treturn 'a';\n\t} catch {\n\t\treturn 'b';\n\t} finally {\n\t\treturn 'c';\n\t}\n}",
			errors: [
				{ message: RETURNS_TEXT, line: 3, column: 3 },
				{ message: RETURNS_TEXT, line: 5, column: 3 },
				{ message: RETURNS_TEXT, line: 7, column: 3 },
			],
		},
		{
			name: 'inside a for loop',
			code:
				"export function Foo() {\n\tfor (let i = 0; i < 3; i++) {\n\t\treturn 'x';\n\t}\n\treturn <div/>;\n}",
			errors: [{ message: RETURNS_TEXT, line: 3, column: 3 }],
		},
		{
			name: 'inside a for-of loop',
			code:
				"export function Foo() {\n\tfor (const i of list) {\n\t\treturn 'x';\n\t}\n\treturn <div/>;\n}",
			errors: [{ message: RETURNS_TEXT, line: 3, column: 3 }],
		},
		{
			name: 'inside a for-in loop',
			code:
				"export function Foo() {\n\tfor (const k in obj) {\n\t\treturn 'x';\n\t}\n\treturn <div/>;\n}",
			errors: [{ message: RETURNS_TEXT, line: 3, column: 3 }],
		},
		{
			name: 'inside a while loop',
			code:
				"export function Foo() {\n\twhile (a) {\n\t\treturn 'x';\n\t}\n\treturn <div/>;\n}",
			errors: [{ message: RETURNS_TEXT, line: 3, column: 3 }],
		},
		{
			name: 'inside a do-while loop',
			code: "export function Foo() {\n\tdo {\n\t\treturn 'x';\n\t} while (a);\n}",
			errors: [{ message: RETURNS_TEXT, line: 3, column: 3 }],
		},
		{
			name: 'capitalised nested function is treated as a component',
			code:
				"export function Foo() {\n\tfunction Helper() {\n\t\treturn 'x';\n\t}\n\treturn <div/>;\n}",
			errors: [{ message: RETURNS_TEXT, line: 3, column: 3 }],
		},

		// The rule listens only for `FunctionDeclaration` and reads the component
		// name off `node.id`. Everything below returns a text node from something
		// React renders as a component, and none of it is reported. This codebase
		// writes components as arrow functions, which is why the rule currently
		// finds nothing in `src`.
		{
			todo: 'arrow function components are never visited',
			name: 'GAP: arrow component with an expression body',
			code: "export const Foo = () => 'text';",
			errors: 1,
		},
		{
			todo: 'arrow function components are never visited',
			name: 'GAP: arrow component with a block body',
			code: "export const Foo = () => {\n\treturn 'text';\n};",
			errors: [{ message: RETURNS_TEXT, line: 2, column: 2 }],
		},
		{
			todo: 'anonymous declarations have no node.id to read a name from',
			name: 'GAP: anonymous default-exported component',
			code: "export default function () {\n\treturn 'text';\n}",
			errors: [{ message: RETURNS_TEXT, line: 2, column: 2 }],
		},
	],
});
