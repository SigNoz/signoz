export enum MenuItemKeys {
	View = 'view',
	Edit = 'edit',
	Delete = 'delete',
	Clone = 'clone',
	CreateAlerts = 'createAlerts',
	Download = 'download',
	ViewTraces = 'viewTraces',
	ViewLogs = 'viewLogs',
}

export const MENUITEM_KEYS_VS_LABELS = {
	[MenuItemKeys.View]: 'View',
	[MenuItemKeys.Edit]: 'Edit',
	[MenuItemKeys.Delete]: 'Delete',
	[MenuItemKeys.Clone]: 'Clone',
	[MenuItemKeys.CreateAlerts]: 'Create Alerts',
	[MenuItemKeys.Download]: 'Download as CSV',
	[MenuItemKeys.ViewTraces]: 'View Traces',
	[MenuItemKeys.ViewLogs]: 'View Logs',
};
