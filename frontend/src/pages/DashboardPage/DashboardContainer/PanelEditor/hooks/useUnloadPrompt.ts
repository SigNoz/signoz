import { useEffect } from 'react';

/** While `enabled`, a refresh or tab close asks the browser to confirm leaving. */
export function useUnloadPrompt(enabled: boolean): void {
	useEffect(() => {
		if (!enabled) {
			return undefined;
		}
		const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
			event.preventDefault();
		};
		window.addEventListener('beforeunload', handleBeforeUnload);
		return (): void => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	}, [enabled]);
}
