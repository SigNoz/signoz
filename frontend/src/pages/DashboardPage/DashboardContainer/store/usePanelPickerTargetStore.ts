import { create } from 'zustand';

import type { PanelKind } from '../Panels/types/panelKind';

export interface ScrollOrigin {
	element: HTMLElement;
	top: number;
}

export interface PanelPickerTarget {
	layoutIndex: number;
	panelKind: PanelKind;
	/** Outline the section; off when there's only one place to add to. */
	outline: boolean;
}

export interface PanelPickerDraftSection {
	title: string;
	panelKind: PanelKind;
}

/**
 * Where the open new-panel picker will add its panel, so the dashboard can mark the
 * section and preview the slot behind the drawer. `scrollOrigin` is the scroll
 * position before the first reveal, restored if the picker is dismissed.
 */
export interface PanelPickerTargetStore {
	target: PanelPickerTarget | null;
	/** Section the picker will create; null when not creating one. */
	draftSection: PanelPickerDraftSection | null;
	scrollOrigin: ScrollOrigin | null;
	setTarget: (target: PanelPickerTarget | null) => void;
	setDraftSection: (draft: PanelPickerDraftSection | null) => void;
	/** No-op once an origin is recorded, so later reveals keep the first position. */
	rememberScrollOrigin: (origin: ScrollOrigin) => void;
	reset: () => void;
}

export const usePanelPickerTargetStore = create<PanelPickerTargetStore>(
	(set, get) => ({
		target: null,
		draftSection: null,
		scrollOrigin: null,
		setTarget: (target): void => {
			set({ target });
		},
		setDraftSection: (draftSection): void => {
			set({ draftSection });
		},
		rememberScrollOrigin: (origin): void => {
			if (!get().scrollOrigin) {
				set({ scrollOrigin: origin });
			}
		},
		reset: (): void => {
			set({
				target: null,
				draftSection: null,
				scrollOrigin: null,
			});
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
