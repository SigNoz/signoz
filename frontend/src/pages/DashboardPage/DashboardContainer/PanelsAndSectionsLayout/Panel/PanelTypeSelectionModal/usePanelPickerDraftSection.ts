import { useEffect } from 'react';

import type { PanelKind } from '../../../Panels/types/panelKind';
import { usePanelPickerTargetStore } from '../../../store/usePanelPickerTargetStore';

export function usePanelPickerDraftSection(
	title: string | null,
	panelKind: PanelKind,
	enabled: boolean,
): void {
	const setDraftSection = usePanelPickerTargetStore((s) => s.setDraftSection);

	useEffect(() => {
		if (enabled) {
			setDraftSection(title === null ? null : { title, panelKind });
		}
	}, [enabled, title, panelKind, setDraftSection]);

	// Cleared only on close, so typing updates the preview without unmounting it.
	useEffect(() => {
		if (!enabled) {
			return undefined;
		}
		return (): void => setDraftSection(null);
	}, [enabled, setDraftSection]);
}
