import { useCallback, useEffect, useRef, useState } from 'react';

// Bounds the history when no parent ever echoes the edits back.
const MAX_PENDING_ECHOES = 200;

/**
 * Text of a query editor whose edits round-trip through query state. Each
 * edit comes back as `external` one or more renders later; writing an older
 * copy into the editor would drop the keys typed since and move the caret to
 * the start. Values the editor sent are ignored when they come back, and any
 * other `external` value replaces the text.
 */
export function useEditorDraft(
	external: string,
): [string, (value: string) => void] {
	const [draft, setDraft] = useState(external);
	const pendingEchoes = useRef<string[]>([]);

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
			return;
		}
		pendingEchoes.current = pendingEchoes.current.slice(index + 1);
	}, [external]);

	const edit = useCallback((value: string): void => {
		pendingEchoes.current.push(value);
		if (pendingEchoes.current.length > MAX_PENDING_ECHOES) {
			pendingEchoes.current.shift();
		}
		setDraft(value);
	}, []);

	return [draft, edit];
}
