// CodeMirror syntax highlighting for the dashboards-list DSL, driven by the same
// tokenizer used for autocomplete (dslTokenizer). Each key / operator / value /
// AND-OR span gets a `cm-dsl-*` class coloured in SearchBar.module.scss.
import { RangeSetBuilder } from '@codemirror/state';
import {
	Decoration,
	type DecorationSet,
	type EditorView,
	ViewPlugin,
	type ViewUpdate,
} from '@codemirror/view';

import { scanTerm, splitTopLevelTerms } from '../../utils/dslTokenizer';

const KEY = Decoration.mark({ class: 'cm-dsl-key' });
const OP = Decoration.mark({ class: 'cm-dsl-op' });
const STRING = Decoration.mark({ class: 'cm-dsl-string' });
const VALUE = Decoration.mark({ class: 'cm-dsl-value' });
const LOGIC = Decoration.mark({ class: 'cm-dsl-logic' });

interface Marked {
	from: number;
	to: number;
	deco: Decoration;
}

const collectRanges = (query: string): Marked[] => {
	const ranges: Marked[] = [];
	const terms = splitTopLevelTerms(query);
	terms.forEach((term, i) => {
		// The AND/OR keyword sits in the gap before this term.
		if (i > 0 && term.precedingJoiner) {
			const prevEnd = terms[i - 1].end;
			const m = /\b(?:AND|OR)\b/i.exec(query.slice(prevEnd, term.start));
			if (m) {
				ranges.push({
					from: prevEnd + m.index,
					to: prevEnd + m.index + m[0].length,
					deco: LOGIC,
				});
			}
		}
		const scan = scanTerm(term.text);
		const base = term.start;
		if (scan.key) {
			ranges.push({
				from: base + scan.key.start,
				to: base + scan.key.end,
				deco: KEY,
			});
		}
		if (scan.operator) {
			ranges.push({
				from: base + scan.operator.start,
				to: base + scan.operator.end,
				deco: OP,
			});
		}
		if (scan.value) {
			const isString = /^['"]/.test(scan.value.text.trim());
			ranges.push({
				from: base + scan.value.start,
				to: base + scan.value.end,
				deco: isString ? STRING : VALUE,
			});
		}
	});
	return ranges
		.filter((r) => r.to > r.from)
		.sort((a, b) => a.from - b.from || a.to - b.to);
};

const buildDecorations = (view: EditorView): DecorationSet => {
	const builder = new RangeSetBuilder<Decoration>();
	collectRanges(view.state.doc.toString()).forEach((r) => {
		builder.add(r.from, r.to, r.deco);
	});
	return builder.finish();
};

export const dslHighlight = ViewPlugin.fromClass(
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
