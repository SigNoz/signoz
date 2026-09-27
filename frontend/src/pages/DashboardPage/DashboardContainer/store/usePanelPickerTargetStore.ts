import { create } from 'zustand';

export interface ScrollOrigin {
	element: HTMLElement;
	top: number;
}

/**
 * The section the open new-panel picker targets, so it can be highlighted behind the
 * drawer. `scrollOrigin` is the scroll position before the first reveal, restored if
 * the picker is dismissed.
 */
export interface PanelPickerTargetStore {
	targetLayoutIndex: number | null;
	scrollOrigin: ScrollOrigin | null;
	setTargetLayoutIndex: (layoutIndex: number | null) => void;
	/** No-op once an origin is recorded, so later reveals keep the first position. */
	rememberScrollOrigin: (origin: ScrollOrigin) => void;
	reset: () => void;
}

export const usePanelPickerTargetStore = create<PanelPickerTargetStore>(
	(set, get) => ({
		targetLayoutIndex: null,
		scrollOrigin: null,
		setTargetLayoutIndex: (targetLayoutIndex): void => {
			set({ targetLayoutIndex });
		},
		rememberScrollOrigin: (origin): void => {
			if (!get().scrollOrigin) {
				set({ scrollOrigin: origin });
			}
		},
		reset: (): void => {
			set({ targetLayoutIndex: null, scrollOrigin: null });
		},
	}),
);

/** Clears the target; with `restoreScroll`, scrolls back to where the dashboard was before any reveal. */
export function releasePanelPickerTarget(restoreScroll: boolean): void {
	const { scrollOrigin, reset } = usePanelPickerTargetStore.getState();
	if (restoreScroll && scrollOrigin) {
		scrollOrigin.element.scrollTo({ top: scrollOrigin.top, behavior: 'smooth' });
	}
	reset();
}
