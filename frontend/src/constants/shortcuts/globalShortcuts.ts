import { getUserOperatingSystem, UserOperatingSystem } from 'utils/getUserOS';

const userOS = getUserOperatingSystem();
export const GlobalShortcuts = {
	SidebarCollapse: `\\+${userOS === UserOperatingSystem.MACOS ? 'cmd' : 'ctrl'}`,
	NavigateToServices: 's+shift',
	NavigateToTraces: 't+shift',
	NavigateToLogs: 'l+shift',
	NavigateToDashboards: 'd+shift',
	NavigateToAlerts: 'a+shift',
	NavigateToExceptions: 'e+shift',
};

export const GlobalShortcutsDescription = {
	SidebarCollapse: 'Collpase the sidebar',
	NavigateToServices: 'Navigate to Services page',
	NavigateToTraces: 'Navigate to Traces page',
	NavigateToLogs: 'Navigate to logs page',
	NavigateToDashboards: 'Navigate to dashboards page',
	NavigateToAlerts: 'Navigate to alerts page',
	NavigateToExceptions: 'Navigate to Exceptions page',
};
