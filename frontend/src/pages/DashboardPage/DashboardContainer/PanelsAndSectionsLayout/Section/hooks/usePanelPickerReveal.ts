import { RefObject, useEffect } from 'react';

import { usePanelPickerTargetStore } from '../../../store/usePanelPickerTargetStore';
import { centeredScrollTop, getScrollParent } from './scrollUtils';

/** Centers the element when `active` turns on, recording the prior position for a dismissed picker. */
export function usePanelPickerReveal(
	ref: RefObject<HTMLElement>,
	active: boolean,
): void {
	const rememberScrollOrigin = usePanelPickerTargetStore(
		(s) => s.rememberScrollOrigin,
	);

	useEffect(() => {
		if (!active) {
			return undefined;
		}
		// A frame later the grid has placed the element and the opening drawer can't cancel the scroll.
		const frame = requestAnimationFrame(() => {
			const element = ref.current;
			if (!element) {
				return;
			}
			const scroller = getScrollParent(element);
			rememberScrollOrigin({ element: scroller, top: scroller.scrollTop });
			scroller.scrollTo({
				top: centeredScrollTop(scroller, element),
				behavior: 'smooth',
			});
		});
		return (): void => cancelAnimationFrame(frame);
	}, [active, ref, rememberScrollOrigin]);
}
