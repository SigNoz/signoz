import type { Extension, Line, Range } from '@codemirror/state';
import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
} from '@codemirror/view';

const FENCE_PATTERN = /^ {0,3}(```|~~~)/;
const HEADING_PATTERN = /^ {0,3}#{1,6} /;
const QUOTE_PATTERN = /^ {0,3}> ?/;
const LIST_MARKER_PATTERN = /^ {0,3}([-*+]|\d+\.) /;

/**
 * Convention: capture group 1, when present, is a left guard the token excludes —
 * the token runs from the end of that group to the end of the match. Lookbehind is
 * avoided for Safari compatibility, so guards are captured rather than asserted.
 */
const INLINE_PATTERNS: { pattern: RegExp; className: string }[] = [
	{ pattern: /`[^`\n]+`/g, className: 'cm-md-code' },
	{ pattern: /\*\*[^*\n]+\*\*/g, className: 'cm-md-strong' },
	{ pattern: /(^|[^\w*_`])_[^_\n]+_(?![\w_])/g, className: 'cm-md-emphasis' },
	{ pattern: /!?\[[^\]\n]*\]\([^)\n]*\)/g, className: 'cm-md-link' },
	{
		// The four variable syntaxes a dashboard body may carry.
		pattern:
			/\{\{\s*\.?[\w.-]+\s*\}\}|\[\[\s*[\w.-]+\s*\]\]|\$(?!__)[A-Za-z_]\w*(?:\.\w+)*/g,
		className: 'cm-md-variable',
	},
];

const MARKS = {
	heading: Decoration.mark({ class: 'cm-md-heading' }),
	quote: Decoration.mark({ class: 'cm-md-quote' }),
	listMarker: Decoration.mark({ class: 'cm-md-list-marker' }),
	code: Decoration.mark({ class: 'cm-md-code' }),
} as const;

const INLINE_MARKS = INLINE_PATTERNS.map(({ pattern, className }) => ({
	pattern,
	mark: Decoration.mark({ class: className }),
}));

function pushInlineMarks(
	lineText: string,
	lineFrom: number,
	ranges: Range<Decoration>[],
): void {
	INLINE_MARKS.forEach(({ pattern, mark }) => {
		pattern.lastIndex = 0;
		let match = pattern.exec(lineText);
		while (match !== null) {
			const guardLength = match[1]?.length ?? 0;
			const from = lineFrom + match.index + guardLength;
			const to = lineFrom + match.index + match[0].length;
			if (to > from) {
				ranges.push(mark.range(from, to));
			}
			match = pattern.exec(lineText);
		}
	});
}

function pushBlockMark(line: Line, ranges: Range<Decoration>[]): void {
	if (HEADING_PATTERN.test(line.text)) {
		ranges.push(MARKS.heading.range(line.from, line.to));
		return;
	}
	if (QUOTE_PATTERN.test(line.text)) {
		ranges.push(MARKS.quote.range(line.from, line.to));
		return;
	}
	const listMarker = LIST_MARKER_PATTERN.exec(line.text);
	if (listMarker) {
		ranges.push(
			MARKS.listMarker.range(line.from, line.from + listMarker[0].length),
		);
	}
}

// Scans the whole document rather than the viewport: fenced blocks opening above
// the visible range would otherwise be mis-detected. Bounded by the length cap.
function buildDecorations(view: EditorView): DecorationSet {
	const { doc } = view.state;
	const ranges: Range<Decoration>[] = [];
	let isInsideFence = false;

	for (let lineNumber = 1; lineNumber <= doc.lines; lineNumber += 1) {
		const line = doc.line(lineNumber);
		const isFenceDelimiter = FENCE_PATTERN.test(line.text);

		if (isFenceDelimiter || isInsideFence) {
			if (line.to > line.from) {
				ranges.push(MARKS.code.range(line.from, line.to));
			}
			isInsideFence = isFenceDelimiter ? !isInsideFence : isInsideFence;
		} else {
			pushBlockMark(line, ranges);
			pushInlineMarks(line.text, line.from, ranges);
		}
	}

	return Decoration.set(ranges, true);
}

// Colours come from custom properties so the SCSS module owns light/dark.
const syntaxTheme = EditorView.theme({
	'.cm-md-heading': {
		color: 'var(--md-syntax-heading)',
		fontWeight: '600',
	},
	'.cm-md-quote': { color: 'var(--md-syntax-quote)', fontStyle: 'italic' },
	'.cm-md-list-marker': { color: 'var(--md-syntax-marker)' },
	'.cm-md-code': { color: 'var(--md-syntax-code)' },
	'.cm-md-strong': { color: 'var(--md-syntax-strong)', fontWeight: '600' },
	'.cm-md-emphasis': {
		color: 'var(--md-syntax-emphasis)',
		fontStyle: 'italic',
	},
	'.cm-md-link': { color: 'var(--md-syntax-link)' },
	'.cm-md-variable': { color: 'var(--md-syntax-variable)' },
});

const highlightPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildDecorations(view);
		}

		update(update: ViewUpdate): void {
			if (update.docChanged || update.viewportChanged) {
				this.decorations = buildDecorations(update.view);
			}
		}
	},
	{ decorations: (plugin): DecorationSet => plugin.decorations },
);

/**
 * Decorations rather than a grammar, so the editor stays on the CodeMirror packages
 * already bundled — no `@codemirror/lang-markdown` / `@lezer` for what is only a
 * colouring pass over a body the renderer parses for real.
 */
export function markdownHighlight(): Extension {
	return [highlightPlugin, syntaxTheme];
}
