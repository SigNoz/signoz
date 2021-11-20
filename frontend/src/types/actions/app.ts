import { SettingTab } from 'types/reducer/app';

export const SWITCH_DARK_MODE = 'SWITCH_DARK_MODE';
export const LOGGED_IN = 'LOGGED_IN';
export const TOGGLE_SETTINGS_TABS = 'TOGGLE_SETTINGS_TABS';

export interface SwitchDarkMode {
	type: typeof SWITCH_DARK_MODE;
}

export interface LoggedInUser {
	type: typeof LOGGED_IN;
}

export interface ToggleSettingsTab {
	type: typeof TOGGLE_SETTINGS_TABS;
	payload: {
		activeTab: SettingTab;
	};
}

export type AppAction = SwitchDarkMode | LoggedInUser | ToggleSettingsTab;
