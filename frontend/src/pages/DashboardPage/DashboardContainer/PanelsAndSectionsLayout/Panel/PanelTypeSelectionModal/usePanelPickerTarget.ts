import { useEffect } from 'react';

import { usePanelPickerTargetStore } from '../../../store/usePanelPickerTargetStore';

/** Publishes the picker's chosen section while open so it's highlighted behind the drawer. */
export function usePanelPickerTarget(
	layoutIndex: number | undefined,
	enabled: boolean,
): void {
	const setTargetLayoutIndex = usePanelPickerTargetStore(
		(s) => s.setTargetLayoutIndex,
	);

	// Only the open picker writes, so the closed instances mounted per section don't clobber it.
	useEffect(() => {
		if (!enabled || layoutIndex === undefined) {
			return undefined;
		}
		setTargetLayoutIndex(layoutIndex);
		return (): void => setTargetLayoutIndex(null);
	}, [enabled, layoutIndex, setTargetLayoutIndex]);
}
