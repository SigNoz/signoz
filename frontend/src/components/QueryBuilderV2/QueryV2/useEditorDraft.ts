import { useCallback, useEffect, useRef, useState } from 'react';

// Bounds the history when no parent ever echoes the edits back.
const MAX_SENT = 200;

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
	const sent = useRef<string[]>([]);

	useEffect(() => {
		const index = sent.current.indexOf(external);
		if (index === -1) {
			sent.current = [];
			setDraft(external);
			return;
		}
		sent.current = sent.current.slice(index + 1);
	}, [external]);

	const edit = useCallback((value: string): void => {
		sent.current.push(value);
		if (sent.current.length > MAX_SENT) {
			sent.current.shift();
		}
		setDraft(value);
	}, []);

	return [draft, edit];
}
