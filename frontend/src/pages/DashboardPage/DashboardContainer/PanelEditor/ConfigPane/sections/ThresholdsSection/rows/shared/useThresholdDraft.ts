import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import useDebouncedFn from 'hooks/useDebouncedFunction';

interface ThresholdDraft<T> {
	draft: T;
	setDraft: Dispatch<SetStateAction<T>>;
	/** Parse a raw input string into `value`, ignoring transient non-numeric input. */
	setValue: (raw: string) => void;
}

const LIVE_PREVIEW_DEBOUNCE_MS = 150;

/**
 * Local draft for a threshold row, shared by every variant. Snapshots the saved
 * threshold on each entry into edit mode and exposes the numeric `value` setter all
 * variants use. `onLiveChange` mirrors the draft into the spec as the user edits, so the
 * panel preview updates live (without Save); the section reverts it on Discard.
 */
export function useThresholdDraft<T extends { value: number }>(
	threshold: T,
	isEditing: boolean,
	onLiveChange?: (draft: T) => void,
): ThresholdDraft<T> {
	const [draft, setDraft] = useState<T>(threshold);

	const emitLiveChange = useDebouncedFn((next) => {
		onLiveChange?.(next as T);
	}, LIVE_PREVIEW_DEBOUNCE_MS);

	useEffect(() => {
		if (isEditing) {
			setDraft(threshold);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot only on edit entry
	}, [isEditing]);

	useEffect(() => {
		if (isEditing) {
			emitLiveChange(draft);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- propagate on draft change only
	}, [draft]);

	useEffect(() => {
		if (!isEditing) {
			emitLiveChange.cancel();
		}
		return (): void => emitLiveChange.cancel();
	}, [isEditing, emitLiveChange]);

	const setValue = (raw: string): void => {
		const next = Number(raw);
		setDraft((d) => ({ ...d, value: Number.isNaN(next) ? d.value : next }));
	};

	return { draft, setDraft, setValue };
}
