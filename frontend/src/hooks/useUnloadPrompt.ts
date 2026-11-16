import { useEffect } from 'react';
import { holdUnsavedChanges } from 'store/unsavedChanges/unsavedChangesStore';

/**
 * While `enabled`, a refresh or tab close asks the browser to confirm leaving,
 * and the new-version prompt waits.
 */
export function useUnloadPrompt(enabled: boolean): void {
	useEffect(() => {
		if (!enabled) {
			return undefined;
		}
		const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
			event.preventDefault();
		};
		window.addEventListener('beforeunload', handleBeforeUnload);
		const releaseUnsavedChanges = holdUnsavedChanges();
		return (): void => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
			releaseUnsavedChanges();
		};
	}, [enabled]);
}
