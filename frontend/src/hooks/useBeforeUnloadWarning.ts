import { useEffect } from 'react';

/**
 * Shows the browser's native "unsaved changes" confirmation when the user
 * refreshes or closes the tab while `enabled` is true. In-app navigation is
 * unaffected — guard that separately (e.g. with a discard-changes modal).
 */
const useBeforeUnloadWarning = (enabled: boolean): void => {
	useEffect(() => {
		if (!enabled) {
			return undefined;
		}

		const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
			event.preventDefault();
			// Chrome requires returnValue to be set for the dialog to appear
			event.returnValue = '';
		};

		window.addEventListener('beforeunload', handleBeforeUnload);
		return (): void =>
			window.removeEventListener('beforeunload', handleBeforeUnload);
	}, [enabled]);
};

export default useBeforeUnloadWarning;
