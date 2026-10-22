import { create } from 'zustand';

import type { ExtendTimeWindow } from '../Panels/components/NoData/extendWindow';

/**
 * Kept out of `useDashboardStore` (never persisted): the View modal publishes its
 * local-window extender here so the deeply-nested `NoData` state reads it without
 * prop threading. Set while the modal is open, cleared on close.
 */
export interface ViewPanelStore {
	viewPanelExtendWindow: ExtendTimeWindow | null;
	setViewPanelExtendWindow: (extendWindow: ExtendTimeWindow | null) => void;
}

export const useViewPanelStore = create<ViewPanelStore>((set) => ({
	viewPanelExtendWindow: null,
	setViewPanelExtendWindow: (viewPanelExtendWindow): void => {
		set({ viewPanelExtendWindow });
	},
}));

export const selectViewPanelExtendWindow = (
	state: ViewPanelStore,
): ExtendTimeWindow | null => state.viewPanelExtendWindow;
