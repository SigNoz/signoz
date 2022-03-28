import AppReducer from 'types/reducer/app';

export const SWITCH_DARK_MODE = 'SWITCH_DARK_MODE';
export const LOGGED_IN = 'LOGGED_IN';
export const SIDEBAR_COLLAPSE = 'SIDEBAR_COLLAPSE';
export const UPDATE_APP_VERSION = 'UPDATE_APP_VERSION';

export interface SwitchDarkMode {
	type: typeof SWITCH_DARK_MODE;
}

export interface LoggedInUser {
	type: typeof LOGGED_IN;
}

export interface SideBarCollapse {
	type: typeof SIDEBAR_COLLAPSE;
	payload: boolean;
}

export interface UpdateAppVersion {
	type: typeof UPDATE_APP_VERSION;
	payload: {
		currentVersion: AppReducer['currentVersion'];
		latestVersion: AppReducer['latestVersion'];
	};
}

export type AppAction =
	| SwitchDarkMode
	| LoggedInUser
	| SideBarCollapse
	| UpdateAppVersion;
