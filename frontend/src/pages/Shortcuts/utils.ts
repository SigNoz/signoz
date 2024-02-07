import { TableProps } from 'antd';
import {
	GlobalShortcuts,
	GlobalShortcutsDescription,
} from 'constants/shortcuts/globalShortcuts';
import {
	LogsExplorerShortcuts,
	LogsExplorerShortcutsDescription,
} from 'constants/shortcuts/logsExplorerShortcuts';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ALL_SHORTCUTS: Record<string, Record<string, string>> = {
	'Global Shortcuts': GlobalShortcuts,
	'Logs Explorer Shortcuts': LogsExplorerShortcuts,
};

export const ALL_SHORTCUTS_DESCRIPTION: Record<
	string,
	Record<string, string>
> = {
	'Global Shortcuts': GlobalShortcutsDescription,
	'Logs Explorer Shortcuts': LogsExplorerShortcutsDescription,
};

export const shortcutColumns = [
	{
		title: 'Keyboard Shortcut',
		dataIndex: 'shortcutKey',
		key: 'shortcutKey',
		width: '30%',
	},
	{
		title: 'Description',
		dataIndex: 'shortcutDescription',
		key: 'shortcutDescription',
	},
];

interface ShortcutRow {
	shortcutKey: string;
	shortcutDescription: string;
}

export function generateTableData(
	shortcutSection: string,
): TableProps<ShortcutRow>['dataSource'] {
	const shortcuts = ALL_SHORTCUTS[shortcutSection];
	const shortcutsDescription = ALL_SHORTCUTS_DESCRIPTION[shortcutSection];
	return Object.keys(shortcuts).map((shortcutName) => ({
		key: `${shortcuts[shortcutName]} ${shortcutName}`,
		shortcutKey: shortcuts[shortcutName],
		shortcutDescription: shortcutsDescription[shortcutName],
	}));
}
