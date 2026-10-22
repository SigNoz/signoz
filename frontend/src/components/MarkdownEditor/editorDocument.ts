import { EditorView } from '@uiw/react-codemirror';

import type { EditorSnapshot, EditorTransform } from './types';

// Narrows a whole-document replacement to the range that changed, so a toolbar
// action doesn't invalidate the document's decorations or scroll position.
function toChangeSpec(
	previous: string,
	next: string,
): { from: number; to: number; insert: string } | null {
	if (previous === next) {
		return null;
	}

	const shorter = Math.min(previous.length, next.length);
	let start = 0;
	while (start < shorter && previous[start] === next[start]) {
		start += 1;
	}

	let previousEnd = previous.length;
	let nextEnd = next.length;
	while (
		previousEnd > start &&
		nextEnd > start &&
		previous[previousEnd - 1] === next[nextEnd - 1]
	) {
		previousEnd -= 1;
		nextEnd -= 1;
	}

	return { from: start, to: previousEnd, insert: next.slice(start, nextEnd) };
}

export function readSnapshot(view: EditorView): EditorSnapshot {
	const range = view.state.selection.main;
	return {
		text: view.state.doc.toString(),
		selectionStart: range.from,
		selectionEnd: range.to,
	};
}

/** Returns whether the transform ran, as CodeMirror's keymap contract expects. */
export function applyTransform(
	view: EditorView,
	transform: EditorTransform,
): boolean {
	if (view.state.readOnly) {
		return false;
	}

	const next = transform(readSnapshot(view));
	const changes = toChangeSpec(view.state.doc.toString(), next.text);
	view.dispatch({
		...(changes ? { changes } : {}),
		selection: { anchor: next.selectionStart, head: next.selectionEnd },
		scrollIntoView: true,
	});
	view.focus();
	return true;
}

/** Replaces the whole document, for seeding and external replacements. */
export function replaceDocument(view: EditorView, next: string): void {
	view.dispatch({
		changes: { from: 0, to: view.state.doc.length, insert: next },
	});
}
