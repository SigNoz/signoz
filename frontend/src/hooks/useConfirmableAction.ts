import { useCallback, useMemo, useState } from 'react';

export interface ConfirmableAction {
	/** Whether the confirmation prompt is open. */
	open: boolean;
	/** The confirmed action is in flight. */
	isPending: boolean;
	/** Open the confirmation prompt (e.g. from a menu item / button). */
	request: () => void;
	/** Run the action, tracking the in-flight flag; closes the prompt on success. */
	confirm: () => Promise<void>;
	/** Dismiss the prompt without acting. */
	cancel: () => void;
}

/**
 * Generic two-step confirm flow for a (usually destructive) async action.
 * `request()` opens the prompt, `confirm()` runs `action` while tracking an
 * in-flight flag and closes on success, `cancel()` dismisses it. Owns only the
 * confirm state machine — what renders the prompt (dialog, popover) is the
 * caller's concern, so it stays reusable across confirm surfaces.
 */
export function useConfirmableAction(
	action: () => Promise<void>,
): ConfirmableAction {
	const [open, setOpen] = useState(false);
	const [isPending, setIsPending] = useState(false);

	const request = useCallback((): void => setOpen(true), []);
	const cancel = useCallback((): void => setOpen(false), []);
	const confirm = useCallback(async (): Promise<void> => {
		setIsPending(true);
		try {
			await action();
			setOpen(false);
		} finally {
			setIsPending(false);
		}
	}, [action]);

	return useMemo(
		() => ({ open, isPending, request, confirm, cancel }),
		[open, isPending, request, confirm, cancel],
	);
}
