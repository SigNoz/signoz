import { useEffect, useRef, useState } from 'react';

interface UseEditableTitleArgs {
	value: string;
	onSave: (next: string) => void;
}

interface UseEditableTitleResult {
	isEditing: boolean;
	draft: string;
	setDraft: (next: string) => void;
	startEdit: () => void;
	cancel: () => void;
	commit: () => void;
}

/**
 * Drives an inline-editable title. The parent owns the canonical `value`; this
 * hook tracks the in-flight `draft` and whether we're editing. `commit` saves
 * only when the trimmed draft is non-empty and actually changed. A `cancelled`
 * ref guards against a blur firing right after Escape from also committing.
 */
export function useEditableTitle({
	value,
	onSave,
}: UseEditableTitleArgs): UseEditableTitleResult {
	const [isEditing, setIsEditing] = useState<boolean>(false);
	const [draft, setDraft] = useState<string>(value);
	const cancelled = useRef<boolean>(false);

	// Keep the draft in sync with the canonical value while not editing (e.g.
	// after a refetch updates the title).
	useEffect(() => {
		if (!isEditing) {
			setDraft(value);
		}
	}, [value, isEditing]);

	const startEdit = (): void => {
		cancelled.current = false;
		setDraft(value);
		setIsEditing(true);
	};

	const cancel = (): void => {
		cancelled.current = true;
		setIsEditing(false);
	};

	const commit = (): void => {
		if (cancelled.current) {
			cancelled.current = false;
			return;
		}
		const trimmed = draft.trim();
		if (trimmed && trimmed !== value) {
			onSave(trimmed);
		}
		setIsEditing(false);
	};

	return { isEditing, draft, setDraft, startEdit, cancel, commit };
}
