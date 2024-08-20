import { getUserOperatingSystem, UserOperatingSystem } from 'utils/getUserOS';

const userOS = getUserOperatingSystem();
export const LogsExplorerShortcuts = {
	StageAndRunQuery: 'enter+meta',
	FocusTheSearchBar: 's',
	ShowAllFilters: '/+meta',
};

export const LogsExplorerShortcutsName = {
	StageAndRunQuery: `${
		userOS === UserOperatingSystem.MACOS ? 'cmd' : 'ctrl'
	}+enter`,
	FocusTheSearchBar: 's',
	ShowAllFilters: `${userOS === UserOperatingSystem.MACOS ? 'cmd' : 'ctrl'}+/`,
};

export const LogsExplorerShortcutsDescription = {
	StageAndRunQuery: 'Stage and Run the current query',
	FocusTheSearchBar: 'Shift the focus to the last query filter bar',
	ShowAllFilters: 'Toggle all filters in the filters dropdown',
};
