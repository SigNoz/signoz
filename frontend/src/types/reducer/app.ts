export interface User {
	accessJwt: string;
	accessJwtExpiry: number;
	refreshJwt: string;
	refreshJwtExpiry: number;
}

export default interface AppReducer {
	isDarkMode: boolean;
	isLoggedIn: boolean;
	isSideBarCollapsed: boolean;
	currentVersion: string;
	latestVersion: string;
	isCurrentVersionError: boolean;
	isLatestVersionError: boolean;
	user: null | User;
}
