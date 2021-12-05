export type SettingTab = 'General' | 'Alert Channels';
export default interface AppReducer {
	isDarkMode: boolean;
	isLoggedIn: boolean;
	settingsActiveTab: SettingTab;
}
