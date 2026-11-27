import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { EditorView } from '@uiw/react-codemirror';

// Bounds the history when no parent ever echoes the edits back.
const MAX_PENDING_ECHOES = 200;

interface EditorDraft {
	/** The editor's current text. */
	draft: string;
	editorRef: MutableRefObject<EditorView | null>;
	/** Spread on `CodeMirror`. */
	editorProps: {
		value: string;
		onChange: (value: string) => void;
		onCreateEditor: (view: EditorView) => void;
	};
}

/**
 * Text of a query editor whose edits round-trip through query state. Each
 * edit comes back as `external` one or more renders later; writing an older
 * copy into the editor would drop the keys typed since and move the caret to
 * the start. Values the editor sent are ignored when they come back, and any
 * other `external` value replaces the text.
 *
 * The editor owns its text, so `editorProps.value` never changes after the
 * first render: `@uiw/react-codemirror` writes a changed `value` over the
 * document in a passive effect, which on a busy page runs after newer keys and
 * drops them. Outside changes are written through the view instead.
 */
export function useEditorDraft(
	external: string,
	onEdit?: (value: string) => void,
): EditorDraft {
	const [draft, setDraft] = useState(external);
	const [initialValue] = useState(external);
	const editorRef = useRef<EditorView | null>(null);
	const pendingEchoes = useRef<string[]>([]);
	const writingOutsideChange = useRef(false);

	const writeIntoEditor = useCallback((view: EditorView, text: string): void => {
		if (view.state.doc.toString() === text) {
			return;
		}
		writingOutsideChange.current = true;
		try {
			view.dispatch({
				changes: { from: 0, to: view.state.doc.length, insert: text },
				selection: { anchor: text.length },
			});
		} finally {
			writingOutsideChange.current = false;
		}
	}, []);

	// Echoes arrive in order, and a batched render can skip some, so a match
	// also drops every older entry: they can no longer come back.
	//
	//   type "c", "co", "cou"   pending [c, co, cou]   draft "cou"
	//   echo "c"                pending [co, cou]      ignored, draft stays "cou"
	//   echo "cou" (skipped co) pending []             ignored
	//   "count() > 5" from a saved view, never sent: applied
	//
	// Keeping the older entries would also swallow an outside change that
	// happens to equal one of them: after typing "a", "ab", a saved view with
	// "a" would be taken for an echo.
	useEffect(() => {
		const index = pendingEchoes.current.indexOf(external);
		if (index === -1) {
			pendingEchoes.current = [];
			setDraft(external);
			if (editorRef.current) {
				writeIntoEditor(editorRef.current, external);
			}
			return;
		}
		pendingEchoes.current = pendingEchoes.current.slice(index + 1);
	}, [external, writeIntoEditor]);

	const onChange = useCallback(
		(value: string): void => {
			if (writingOutsideChange.current) {
				return;
			}
			pendingEchoes.current.push(value);
			if (pendingEchoes.current.length > MAX_PENDING_ECHOES) {
				pendingEchoes.current.shift();
			}
			setDraft(value);
			onEdit?.(value);
		},
		[onEdit],
	);

	const onCreateEditor = useCallback(
		(view: EditorView): void => {
			editorRef.current = view;
			writeIntoEditor(view, draft);
		},
		[draft, writeIntoEditor],
	);

	return {
		draft,
		editorRef,
		editorProps: { value: initialValue, onChange, onCreateEditor },
	};
}
