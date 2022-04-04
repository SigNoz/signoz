export const SWITCH_DARK_MODE = 'SWITCH_DARK_MODE';
export const LOGGED_IN = 'LOGGED_IN';
export const SIDEBAR_COLLAPSE = 'SIDEBAR_COLLAPSE';

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

export type AppAction = SwitchDarkMode | LoggedInUser | SideBarCollapse;
