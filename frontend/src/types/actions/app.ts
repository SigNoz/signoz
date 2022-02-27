export const SWITCH_DARK_MODE = 'SWITCH_DARK_MODE';
export const LOGGED_IN = 'LOGGED_IN';

export interface SwitchDarkMode {
	type: typeof SWITCH_DARK_MODE;
}

export interface LoggedInUser {
	type: typeof LOGGED_IN;
}

export type AppAction = SwitchDarkMode | LoggedInUser;
