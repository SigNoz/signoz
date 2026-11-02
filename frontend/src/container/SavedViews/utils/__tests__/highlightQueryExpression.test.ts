import { tags } from '@lezer/highlight';
import { copilotDarkStyle } from '@uiw/codemirror-theme-copilot';
import { githubLightStyle } from '@uiw/codemirror-theme-github';

import { highlightQueryExpression } from '../highlightQueryExpression';

const EXPRESSION =
	"service.name = 'frontend' AND duration_nano > 100 AND status IN ['ok', 'error']";

function stringColor(styles: typeof copilotDarkStyle): string | undefined {
	return (styles ?? []).find(({ tag }) =>
		(Array.isArray(tag) ? tag : [tag]).includes(tags.string),
	)?.color;
}

describe('highlightQueryExpression', () => {
	it.each([
		['dark', true],
		['light', false],
	])('keeps every character of the expression in %s mode', (_, isDarkMode) => {
		const parts = highlightQueryExpression(EXPRESSION, isDarkMode);

		expect(parts.map(({ text }) => text).join('')).toBe(EXPRESSION);
	});

	it.each([
		['dark', true, copilotDarkStyle],
		['light', false, githubLightStyle],
	])(
		'colours string values like the %s query search theme',
		(_, isDarkMode, styles) => {
			const parts = highlightQueryExpression(EXPRESSION, isDarkMode);

			expect(parts.find(({ text }) => text === "'frontend'")?.color).toBe(
				stringColor(styles),
			);
		},
	);

	it('returns nothing for an empty expression', () => {
		expect(highlightQueryExpression('', true)).toStrictEqual([]);
	});
});
