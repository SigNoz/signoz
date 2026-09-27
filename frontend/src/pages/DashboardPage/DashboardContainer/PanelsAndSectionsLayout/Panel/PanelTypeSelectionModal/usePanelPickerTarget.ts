import { useEffect } from 'react';

import type { PanelKind } from '../../../Panels/types/panelKind';
import { usePanelPickerTargetStore } from '../../../store/usePanelPickerTargetStore';

interface UsePanelPickerTargetArgs {
	open: boolean;
	layoutIndex: number | undefined;
	panelKind: PanelKind;
	outline: boolean;
}

/** Publishes where the open picker will add its panel, for the dashboard behind the drawer. */
export function usePanelPickerTarget({
	open,
	layoutIndex,
	panelKind,
	outline,
}: UsePanelPickerTargetArgs): void {
	const setTarget = usePanelPickerTargetStore((s) => s.setTarget);

	// Only the open picker writes, so the closed instances mounted per section don't clobber it.
	useEffect(() => {
		if (open) {
			setTarget(
				layoutIndex === undefined ? null : { layoutIndex, panelKind, outline },
			);
		}
	}, [open, layoutIndex, panelKind, outline, setTarget]);

	useEffect(() => {
		if (!open) {
			return undefined;
		}
		return (): void => setTarget(null);
	}, [open, setTarget]);
}
