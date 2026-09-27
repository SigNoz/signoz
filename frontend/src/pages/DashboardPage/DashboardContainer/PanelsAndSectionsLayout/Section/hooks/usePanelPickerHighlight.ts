import { RefObject, useEffect } from 'react';

import { usePanelPickerTargetStore } from '../../../store/usePanelPickerTargetStore';
import { getScrollParent } from './scrollUtils';

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
	const rememberScrollOrigin = usePanelPickerTargetStore(
		(s) => s.rememberScrollOrigin,
	);

	useEffect(() => {
		const element = ref.current;
		if (!isTarget || !element) {
			return;
		}
		const scroller = getScrollParent(element);
		rememberScrollOrigin({ element: scroller, top: scroller.scrollTop });
		element.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}, [isTarget, ref, rememberScrollOrigin]);

	return isTarget;
}
