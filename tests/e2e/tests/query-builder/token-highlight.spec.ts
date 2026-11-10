import { expect, LOGS_EXPLORER_PATH, test } from '../../drivers/explorers';

// The editor's highlight colours come from two CodeMirror themes, and the only
// way to read them back is the computed style of a rendered token.

interface ThemeConfig {
	name: string;
	theme: 'dark' | 'light';
	colors: {
		identifier: string;
		operator: string;
		property: string;
		string: string;
	};
}

const THEMES: ThemeConfig[] = [
	{
		name: 'dark (copilot)',
		theme: 'dark',
		colors: {
			identifier: 'rgb(147, 157, 165)',
			operator: 'rgb(186, 142, 247)',
			property: 'rgb(255, 234, 107)',
			string: 'rgb(91, 236, 149)',
		},
	},
	{
		name: 'light (githubLight)',
		theme: 'light',
		colors: {
			identifier: 'rgb(0, 92, 197)',
			operator: 'rgb(0, 92, 197)',
			property: 'rgb(111, 66, 193)',
			string: 'rgb(3, 47, 98)',
		},
	},
];

for (const { name, theme, colors } of THEMES) {
	test.describe(`QueryBuilder token highlighting — ${name}`, () => {
		test('TC-01 each segment of a dotted key gets its own colour', async ({
			authedPage: page,
			editor,
		}) => {
			await editor.setTheme(theme);
			await page.goto(LOGS_EXPLORER_PATH);
			await editor.type('k8s.namespace.name');

			await expect(editor.token('k8s')).toHaveCSS('color', colors.identifier);
			await expect(editor.token('.')).toHaveCSS('color', colors.operator);
			await expect(editor.token('namespace')).toHaveCSS('color', colors.property);
			await expect(editor.token('name')).toHaveCSS('color', colors.property);
		});

		test('TC-02 string tokens take the native theme colour', async ({
			authedPage: page,
			editor,
		}) => {
			await editor.setTheme(theme);
			await page.goto(LOGS_EXPLORER_PATH);
			await editor.type("['value', 'value2']");

			await expect(editor.token("'value'")).toHaveCSS('color', colors.string);
			await expect(editor.token("'value2'")).toHaveCSS('color', colors.string);
		});
	});
}
