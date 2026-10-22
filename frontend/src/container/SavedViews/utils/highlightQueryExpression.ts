import { javascriptLanguage } from '@codemirror/lang-javascript';
import { Highlighter, highlightTree, Tag } from '@lezer/highlight';
import { copilotDarkStyle } from '@uiw/codemirror-theme-copilot';
import { githubLightStyle } from '@uiw/codemirror-theme-github';

import { HighlightedQueryPart } from '../types';

function createThemeHighlighter(styles: typeof copilotDarkStyle): Highlighter {
	const colorByTag = new Map<Tag, string>();
	(styles ?? []).forEach(({ tag, color }) => {
		if (typeof color !== 'string') {
			return;
		}
		(Array.isArray(tag) ? tag : [tag]).forEach((themeTag: Tag) => {
			if (!colorByTag.has(themeTag)) {
				colorByTag.set(themeTag, color);
			}
		});
	});

	return {
		style: (tags): string | null => {
			const match = tags
				.flatMap((tag) => tag.set)
				.find((candidate) => colorByTag.has(candidate));
			return match ? (colorByTag.get(match) ?? null) : null;
		},
	};
}

const DARK_HIGHLIGHTER = createThemeHighlighter(copilotDarkStyle);
const LIGHT_HIGHLIGHTER = createThemeHighlighter(githubLightStyle);

export function highlightQueryExpression(
	expression: string,
	isDarkMode: boolean,
): HighlightedQueryPart[] {
	const tree = javascriptLanguage.parser.parse(expression);
	const parts: HighlightedQueryPart[] = [];
	let position = 0;

	highlightTree(
		tree,
		isDarkMode ? DARK_HIGHLIGHTER : LIGHT_HIGHLIGHTER,
		(from, to, color) => {
			if (from > position) {
				parts.push({ from: position, text: expression.slice(position, from) });
			}
			parts.push({ from, text: expression.slice(from, to), color });
			position = to;
		},
	);

	if (position < expression.length) {
		parts.push({ from: position, text: expression.slice(position) });
	}
	return parts;
}
