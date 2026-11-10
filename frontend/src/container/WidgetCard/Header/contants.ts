export enum MenuItemKeys {
	View = 'view',
	Edit = 'edit',
	Delete = 'delete',
	Clone = 'clone',
	CreateAlerts = 'createAlerts',
	Download = 'download',
}

export const MENUITEM_KEYS_VS_LABELS = {
	[MenuItemKeys.View]: 'View',
	[MenuItemKeys.Edit]: 'Edit',
	[MenuItemKeys.Delete]: 'Delete',
	[MenuItemKeys.Clone]: 'Clone',
	[MenuItemKeys.CreateAlerts]: 'Create Alerts',
	[MenuItemKeys.Download]: 'Download as CSV',
};

export const VIEW_LOADING_TOOLTIP = 'Loading panel data';
export const EDIT_DENIED_TOOLTIP =
	'You do not have permission to edit this panel';
export const CLONE_DENIED_TOOLTIP =
	'You do not have permission to clone this panel';
export const DELETE_DENIED_TOOLTIP =
	'You do not have permission to delete this panel';
