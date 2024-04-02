import { TableProps } from 'antd';
import {
	DashboardShortcuts,
	DashboardShortcutsDescription,
	DashboardShortcutsName,
} from 'constants/shortcuts/DashboardShortcuts';
import {
	GlobalShortcuts,
	GlobalShortcutsDescription,
	GlobalShortcutsName,
} from 'constants/shortcuts/globalShortcuts';
import {
	LogsExplorerShortcuts,
	LogsExplorerShortcutsDescription,
	LogsExplorerShortcutsName,
} from 'constants/shortcuts/logsExplorerShortcuts';
import {
	QBShortcuts,
	QBShortcutsDescription,
	QBShortcutsName,
} from 'constants/shortcuts/QBShortcuts';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ALL_SHORTCUTS: Record<string, Record<string, string>> = {
	'Global Shortcuts': GlobalShortcuts,
	'Logs Explorer Shortcuts': LogsExplorerShortcuts,
	'Query Builder Shortcuts': QBShortcuts,
	'Dashboard Shortcuts': DashboardShortcuts,
};

export const ALL_SHORTCUTS_LABEL: Record<string, Record<string, string>> = {
	'Global Shortcuts': GlobalShortcutsName,
	'Logs Explorer Shortcuts': LogsExplorerShortcutsName,
	'Query Builder Shortcuts': QBShortcutsName,
	'Dashboard Shortcuts': DashboardShortcutsName,
};

export const ALL_SHORTCUTS_DESCRIPTION: Record<
	string,
	Record<string, string>
> = {
	'Global Shortcuts': GlobalShortcutsDescription,
	'Logs Explorer Shortcuts': LogsExplorerShortcutsDescription,
	'Query Builder Shortcuts': QBShortcutsDescription,
	'Dashboard Shortcuts': DashboardShortcutsDescription,
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
	const shortcutsLabel = ALL_SHORTCUTS_LABEL[shortcutSection];
	return Object.keys(shortcuts).map((shortcutName) => ({
		key: `${shortcuts[shortcutName]} ${shortcutName}`,
		shortcutKey: shortcutsLabel[shortcutName],
		shortcutDescription: shortcutsDescription[shortcutName],
	}));
}
