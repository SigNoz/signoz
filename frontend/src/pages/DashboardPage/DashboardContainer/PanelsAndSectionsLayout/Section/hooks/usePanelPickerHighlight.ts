import { RefObject } from 'react';

import { usePanelPickerTargetStore } from '../../../store/usePanelPickerTargetStore';
import { usePanelPickerReveal } from './usePanelPickerReveal';

/**
 * Whether the open new-panel picker targets this section. When it becomes the target,
 * records the pre-reveal scroll position and brings the section into view.
 */
export function usePanelPickerHighlight(
	layoutIndex: number,
	ref: RefObject<HTMLElement>,
): boolean {
	const isTarget = usePanelPickerTargetStore(
		(s) => s.targetLayoutIndex === layoutIndex,
	);
	usePanelPickerReveal(ref, isTarget);

	return isTarget;
}
