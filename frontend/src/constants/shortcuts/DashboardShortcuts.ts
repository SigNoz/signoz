import { getUserOperatingSystem, UserOperatingSystem } from 'utils/getUserOS';

const userOS = getUserOperatingSystem();

export const DashboardShortcuts = {
	SaveChanges: 's+meta',
	DiscardChanges: 'd+meta',
};

export const DashboardShortcutsName = {
	SaveChanges: `${userOS === UserOperatingSystem.MACOS ? 'cmd' : 'ctrl'}+s`,
};

export const DashboardShortcutsDescription = {
	SaveChanges: 'Save Changes',
	DiscardChanges: 'Discard Changes',
};
