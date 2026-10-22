import {
	type PanelPickerTarget,
	usePanelPickerTargetStore,
} from '../../../store/usePanelPickerTargetStore';

/** The open new-panel picker's target when it's this section, else null. */
export function usePanelPickerHighlight(
	layoutIndex: number,
): PanelPickerTarget | null {
	return usePanelPickerTargetStore((s) =>
		s.target?.layoutIndex === layoutIndex ? s.target : null,
	);
}
