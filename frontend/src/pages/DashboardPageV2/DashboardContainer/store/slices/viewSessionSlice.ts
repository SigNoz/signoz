import type { StateCreator } from 'zustand';

import type { ExtendTimeWindow } from '../../Panels/components/NoData/extendWindow';
import type { DashboardStore } from '../useDashboardStore';

/**
 * The open View modal publishes its local-window extender here so the deeply-nested
 * `NoData` empty state reads it from the store instead of via prop threading. Set
 * while the modal is open, cleared on close; not persisted.
 */
export interface ViewSessionSlice {
	/** The open View modal's extender; null when no modal is open. */
	viewPanelExtendWindow: ExtendTimeWindow | null;
	setViewPanelExtendWindow: (extendWindow: ExtendTimeWindow | null) => void;
}

export const createViewSessionSlice: StateCreator<
	DashboardStore,
	[['zustand/persist', unknown]],
	[],
	ViewSessionSlice
> = (set) => ({
	viewPanelExtendWindow: null,
	setViewPanelExtendWindow: (viewPanelExtendWindow): void => {
		set({ viewPanelExtendWindow });
	},
});
