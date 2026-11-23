import { ruleTester } from './rule-tester.mjs';

const message = (property) =>
	`Do not set '${property}' in CSS. Render the text with @signozhq/ui/typography and use its props, or disable this rule with a reason after \`--\` saying why Typography cannot.`;

await ruleTester({
	rule: 'no-text-css',
	valid: [
		{
			name: 'layout properties in a style prop',
			code: 'export const A = () => <div style={{ width: 10, color: "red" }} />;',
		},
		{
			name: 'font properties in an object that is not a style',
			code: 'export const options = { fontSize: 12, font: "12px Inter" };',
		},
		{
			name: 'font properties in a prop that is not a style',
			code: 'export const A = () => <Chart options={{ fontSize: 12 }} />;',
		},
		{
			name: 'computed key',
			code:
				'const k = "fontSize";\nexport const A = () => <div style={{ [k]: 12 }} />;',
		},
		{
			name: 'style identifier from a parameter',
			code: 'export const A = ({ s }) => <div style={s} />;',
		},
		{
			name: 'template without a styled tag',
			code: 'export const s = html`font-size: 12px;`;',
		},
		{
			name: 'styled template with layout only',
			code:
				"import styled from 'styled-components';\nexport const A = styled.div`\n\tdisplay: flex;\n\ttext: none;\n`;",
		},
		{
			name: 'custom property that ends in a banned name',
			code:
				"import styled from 'styled-components';\nexport const A = styled.div`\n\t--my-font-size: 12px;\n`;",
		},
	],
	invalid: [
		{
			name: 'inline style',
			code: 'export const A = () => <div style={{ fontSize: 12, width: 1 }} />;',
			errors: [{ message: message('fontSize'), line: 1, column: 38 }],
		},
		{
			name: 'string key',
			code: "export const A = () => <div style={{ 'line-height': 1 }} />;",
			errors: [{ message: message('line-height') }],
		},
		{
			name: 'every banned family',
			code:
				'export const A = () => (\n\t<div\n\t\tstyle={{\n\t\t\tfont: "x",\n\t\t\tfontWeight: 500,\n\t\t\tfontFamily: "x",\n\t\t\ttextAlign: "center",\n\t\t\ttextTransform: "none",\n\t\t\tlineHeight: 1,\n\t\t\tletterSpacing: 1,\n\t\t}}\n\t/>\n);',
			errors: [
				{ message: message('font') },
				{ message: message('fontWeight') },
				{ message: message('fontFamily') },
				{ message: message('textAlign') },
				{ message: message('textTransform') },
				{ message: message('lineHeight') },
				{ message: message('letterSpacing') },
			],
		},
		{
			name: 'conditional, logical and spread',
			code:
				'export const A = ({ a, b }) => (\n\t<div style={{ ...(a ? { fontSize: 1 } : {}), ...(b && { lineHeight: 1 }) }} />\n);',
			errors: [
				{ message: message('fontSize') },
				{ message: message('lineHeight') },
			],
		},
		{
			name: 'style prop with a Style suffix',
			code:
				'export const A = () => <Card headStyle={{ fontWeight: 600 }} bodyStyle={{ padding: 0 }} />;',
			errors: [{ message: message('fontWeight') }],
		},
		{
			name: 'antd semantic styles',
			code:
				'export const A = () => <Modal styles={{ body: { fontSize: 12 }, header: { padding: 0 } }} />;',
			errors: [{ message: message('fontSize') }],
		},
		{
			name: 'identifier resolved to a local object',
			code:
				'const s = { fontSize: 12 };\nexport const A = () => (\n\t<>\n\t\t<div style={s} />\n\t\t<span style={s} />\n\t</>\n);',
			errors: [{ message: message('fontSize'), line: 1, column: 13 }],
		},
		{
			name: 'useMemo style',
			code:
				"import { useMemo } from 'react';\nexport const A = () => {\n\tconst s = useMemo(() => ({ textAlign: 'left' }), []);\n\treturn <div style={s} />;\n};",
			errors: [{ message: message('textAlign') }],
		},
		{
			name: 'object typed CSSProperties',
			code:
				"import type { CSSProperties } from 'react';\nexport const s: CSSProperties = { fontStyle: 'italic' };",
			errors: [{ message: message('fontStyle') }],
		},
		{
			name:
				'object typed React.CSSProperties, reported once when also used as style',
			code:
				"import React from 'react';\nconst s: React.CSSProperties = { fontSize: 1 };\nexport const A = () => <div style={s} />;",
			errors: [{ message: message('fontSize') }],
		},
		{
			name: 'Record of CSSProperties',
			code:
				"import type { CSSProperties } from 'react';\nexport const s: Record<string, CSSProperties> = { a: { lineHeight: 1 } };",
			errors: [{ message: message('lineHeight') }],
		},
		{
			name: 'as and satisfies CSSProperties',
			code:
				"import type { CSSProperties } from 'react';\nexport const a = { fontSize: 1 } as CSSProperties;\nexport const b = { fontWeight: 1 } satisfies CSSProperties;",
			errors: [
				{ message: message('fontSize') },
				{ message: message('fontWeight') },
			],
		},
		{
			name: 'styled-components template',
			code:
				"import styled from 'styled-components';\nexport const A = styled.div`\n\tdisplay: flex;\n\tfont-size: 12px;\n\tcolor: ${(p) => p.c};\n\ttext-transform: none;line-height: 1;\n`;",
			errors: [
				{ message: message('font-size'), line: 4, column: 2 },
				{ message: message('text-transform'), line: 6, column: 2 },
				{ message: message('line-height'), line: 6, column: 23 },
			],
		},
		{
			name: 'function returning CSSProperties',
			code:
				"import type { CSSProperties } from 'react';\nexport const a = (): CSSProperties => ({ fontSize: 1 });\nexport function b(): CSSProperties {\n\treturn { lineHeight: 1 };\n}",
			errors: [
				{ message: message('fontSize') },
				{ message: message('lineHeight') },
			],
		},
		{
			name: 'strings in styled interpolations',
			code:
				"import styled, { css } from 'styled-components';\nexport const A = styled.div`\n\t${(p) => (p.s ? 'font-size: 11px;' : `line-height: 1;`)}\n\t${(p) => p.b && css`font-weight: 500;`}\n`;",
			errors: [
				{ message: message('font-size'), line: 3, column: 19 },
				{ message: message('line-height'), line: 3, column: 40 },
				{ message: message('font-weight'), line: 4, column: 22 },
			],
		},
		{
			name: 'styled(Component) and css helper',
			code:
				"import styled, { css } from 'styled-components';\nexport const A = styled(B)`letter-spacing: 1px;`;\nexport const c = css`\n\tfont-weight: 500;\n`;",
			errors: [
				{ message: message('letter-spacing'), line: 2, column: 28 },
				{ message: message('font-weight'), line: 4, column: 2 },
			],
		},
	],
});
