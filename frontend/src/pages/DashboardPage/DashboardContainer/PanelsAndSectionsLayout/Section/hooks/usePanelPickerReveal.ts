import { RefObject, useEffect } from 'react';

import { usePanelPickerTargetStore } from '../../../store/usePanelPickerTargetStore';
import { getScrollParent } from './scrollUtils';

/** Scrolls the element into view when `active` turns on, remembering the prior position. */
export function usePanelPickerReveal(
	ref: RefObject<HTMLElement>,
	active: boolean,
): void {
	const rememberScrollOrigin = usePanelPickerTargetStore(
		(s) => s.rememberScrollOrigin,
	);

	useEffect(() => {
		const element = ref.current;
		if (!active || !element) {
			return;
		}
		const scroller = getScrollParent(element);
		rememberScrollOrigin({ element: scroller, top: scroller.scrollTop });
		element.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}, [active, ref, rememberScrollOrigin]);
}
