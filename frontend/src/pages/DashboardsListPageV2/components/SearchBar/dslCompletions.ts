// Bridges our stage-aware DSL suggestion engine into CodeMirror's autocompletion,
// so the query box gets keyboard navigation + a scrollable popup for free.
import {
	type CompletionContext,
	type CompletionResult,
	startCompletion,
} from '@codemirror/autocomplete';
import type { EditorView } from '@codemirror/view';

import {
	getSuggestions,
	type SuggestionSource,
} from '../../utils/dslSuggestions';

// `getSource` is a getter so the freshest tags/users (which load async) are read
// on every keystroke.
export const dslCompletionSource =
	(getSource: () => SuggestionSource) =>
	(context: CompletionContext): CompletionResult | null => {
		const query = context.state.doc.toString();
		const { items, ctx } = getSuggestions(query, context.pos, getSource());
		if (items.length === 0) {
			return null;
		}
		return {
			from: ctx.replaceStart,
			to: ctx.replaceEnd,
			// We already filtered/ranked in getSuggestions; keep CodeMirror from
			// re-filtering by the typed text.
			filter: false,
			options: items.map((item) => ({
				label: item.label,
				type: item.kind,
				detail: item.detail,
				// Insert the raw text (not the display label) and re-open completion so
				// key -> operator -> value chains without extra keystrokes.
				apply: (view: EditorView, _c, from: number, to: number): void => {
					view.dispatch({
						changes: { from, to, insert: item.insertText },
						// caretOffset lands the caret inside a `[...]` list (before its
						// closing bracket) so multi-select can continue.
						selection: {
							anchor: from + item.insertText.length - (item.caretOffset ?? 0),
						},
					});
					startCompletion(view);
				},
			})),
		};
	};
