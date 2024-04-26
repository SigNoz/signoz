import { getUserOperatingSystem, UserOperatingSystem } from 'utils/getUserOS';

const userOS = getUserOperatingSystem();

export const DashboardShortcuts = {
	SaveChanges: 's+meta',
	DiscardChanges: 'd+meta',
};

export const DashboardShortcutsName = {
	SaveChanges: `${userOS === UserOperatingSystem.MACOS ? 'cmd' : 'ctrl'}+s`,
	DiscardChanges: `${userOS === UserOperatingSystem.MACOS ? 'cmd' : 'ctrl'}+d`,
};

export const DashboardShortcutsDescription = {
	SaveChanges: 'Save Changes for panel',
	DiscardChanges: 'Discard Changes for panel',
};
