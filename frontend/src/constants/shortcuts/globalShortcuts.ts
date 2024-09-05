import { getUserOperatingSystem, UserOperatingSystem } from 'utils/getUserOS';

const userOS = getUserOperatingSystem();
export const GlobalShortcuts = {
	SidebarCollapse: '\\+meta',
	NavigateToServices: 's+shift',
	NavigateToTraces: 't+shift',
	NavigateToLogs: 'l+shift',
	NavigateToDashboards: 'd+shift',
	NavigateToAlerts: 'a+shift',
	NavigateToExceptions: 'e+shift',
	NavigateToMessagingQueues: 'm+shift',
};

export const GlobalShortcutsName = {
	SidebarCollapse: `${userOS === UserOperatingSystem.MACOS ? 'cmd' : 'ctrl'}+\\`,
	NavigateToServices: 'shift+s',
	NavigateToTraces: 'shift+t',
	NavigateToLogs: 'shift+l',
	NavigateToDashboards: 'shift+d',
	NavigateToAlerts: 'shift+a',
	NavigateToExceptions: 'shift+e',
	NavigateToMessagingQueues: 'shift+m',
};

export const GlobalShortcutsDescription = {
	SidebarCollapse: 'Collpase the sidebar',
	NavigateToServices: 'Navigate to Services page',
	NavigateToTraces: 'Navigate to Traces page',
	NavigateToLogs: 'Navigate to logs page',
	NavigateToDashboards: 'Navigate to dashboards page',
	NavigateToAlerts: 'Navigate to alerts page',
	NavigateToExceptions: 'Navigate to Exceptions page',
	NavigateToMessagingQueues: 'Navigate to Messaging Queues page',
};
