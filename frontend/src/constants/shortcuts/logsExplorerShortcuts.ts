import { getUserOperatingSystem, UserOperatingSystem } from 'utils/getUserOS';

const userOS = getUserOperatingSystem();
export const LogsExplorerShortcuts = {
	StageAndRunQuery: 'enter+meta',
	FocusTheSearchBar: 's',
};

export const LogsExplorerShortcutsName = {
	StageAndRunQuery: `${
		userOS === UserOperatingSystem.MACOS ? 'cmd' : 'ctrl'
	}+enter`,
	FocusTheSearchBar: 's',
};

export const LogsExplorerShortcutsDescription = {
	StageAndRunQuery: 'Stage and Run the current query',
	FocusTheSearchBar: 'Shift the focus to the last query filter bar',
};
