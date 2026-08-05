import { expect, test } from '../../fixtures/auth';
import { setupTheme, tokenColor, typeExpression } from '@helpers/query-builder';

const LOGS_EXPLORER = '/logs/logs-explorer';

type ThemeConfig = {
	name: string;
	theme: 'dark' | 'light';
	colors: {
		identifier: string;
		operator: string;
		property: string;
		string: string;
	};
};

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
		test(`k8s.namespace.name — each segment gets its own color`, async ({
			authedPage: page,
		}) => {
			await setupTheme(page, theme);
			await page.goto(LOGS_EXPLORER);
			await typeExpression(page, 'k8s.namespace.name');

			expect(await tokenColor(page, 'k8s')).toBe(colors.identifier);
			expect(await tokenColor(page, '.')).toBe(colors.operator);
			expect(await tokenColor(page, 'namespace')).toBe(colors.property);
			expect(await tokenColor(page, 'name')).toBe(colors.property);
		});

		test(`['value', 'value2'] — string tokens have native theme color`, async ({
			authedPage: page,
		}) => {
			await setupTheme(page, theme);
			await page.goto(LOGS_EXPLORER);
			await typeExpression(page, "['value', 'value2']");

			expect(await tokenColor(page, "'value'")).toBe(colors.string);
			expect(await tokenColor(page, "'value2'")).toBe(colors.string);
		});
	});
}
