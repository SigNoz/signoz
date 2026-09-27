import { useEffect } from 'react';

import { usePanelPickerTargetStore } from '../../../store/usePanelPickerTargetStore';

export function usePanelPickerDraftSection(
	title: string | null,
	enabled: boolean,
): void {
	const setDraftSectionTitle = usePanelPickerTargetStore(
		(s) => s.setDraftSectionTitle,
	);

	useEffect(() => {
		if (enabled) {
			setDraftSectionTitle(title);
		}
	}, [enabled, title, setDraftSectionTitle]);

	// Cleared only on close, so typing updates the preview without unmounting it.
	useEffect(() => {
		if (!enabled) {
			return undefined;
		}
		return (): void => setDraftSectionTitle(null);
	}, [enabled, setDraftSectionTitle]);
}
