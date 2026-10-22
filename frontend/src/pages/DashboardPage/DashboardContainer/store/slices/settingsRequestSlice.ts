import type { StateCreator } from 'zustand';

import type { DashboardStore } from '../useDashboardStore';

/** Which settings-drawer tab to open. Mirrors the DashboardSettings tab keys. */
export type SettingsTab = 'Overview' | 'Variables' | 'Publish';

export interface SettingsRequest {
	tab: SettingsTab;
	/** Open the add-variable form immediately (Variables tab only). */
	addVariable?: boolean;
}

/**
 * A transient request to open the settings drawer at a given tab/action, so a
 * control anywhere in the tree (e.g. the "Add variable" button in the variables
 * bar) can deep-link into the drawer without prop-threading. Not persisted;
 * cleared when the drawer closes.
 */
export interface SettingsRequestSlice {
	settingsRequest: SettingsRequest | null;
	requestSettings: (request: SettingsRequest) => void;
	clearSettingsRequest: () => void;
}

export const createSettingsRequestSlice: StateCreator<
	DashboardStore,
	[['zustand/persist', unknown]],
	[],
	SettingsRequestSlice
> = (set) => ({
	settingsRequest: null,
	requestSettings: (settingsRequest): void => {
		set({ settingsRequest });
	},
	clearSettingsRequest: (): void => {
		set({ settingsRequest: null });
	},
});
