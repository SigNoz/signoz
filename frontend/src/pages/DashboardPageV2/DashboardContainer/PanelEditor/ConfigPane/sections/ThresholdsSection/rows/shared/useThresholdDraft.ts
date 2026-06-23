import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

interface ThresholdDraft<T> {
	draft: T;
	setDraft: Dispatch<SetStateAction<T>>;
	/** Parse a raw input string into `value`, ignoring transient non-numeric input. */
	setValue: (raw: string) => void;
}

/**
 * Local draft for a threshold row, shared by every variant. Snapshots the saved
 * threshold on each entry into edit mode (so Discard simply drops the draft and the
 * next edit starts clean) and exposes the numeric `value` setter all variants use.
 */
export function useThresholdDraft<T extends { value: number }>(
	threshold: T,
	isEditing: boolean,
): ThresholdDraft<T> {
	const [draft, setDraft] = useState<T>(threshold);

	useEffect(() => {
		if (isEditing) {
			setDraft(threshold);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot only on edit entry
	}, [isEditing]);

	const setValue = (raw: string): void => {
		const next = Number(raw);
		setDraft((d) => ({ ...d, value: Number.isNaN(next) ? d.value : next }));
	};

	return { draft, setDraft, setValue };
}
