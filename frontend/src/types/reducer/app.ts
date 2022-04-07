export default interface AppReducer {
	isDarkMode: boolean;
	isLoggedIn: boolean;
	isSideBarCollapsed: boolean;
	currentVersion: string;
	latestVersion: string;
	isCurrentVersionError: boolean;
	isLatestVersionError: boolean;
}
