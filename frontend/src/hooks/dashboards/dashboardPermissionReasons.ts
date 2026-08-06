// Tooltip copy for disabled dashboard controls. The exact denied scope
// (e.g. `update:dashboard:<id>`) is emitted separately by AuthZTooltip as the
// `data-denied-permissions` attribute, so these stay human-readable.

export const DASHBOARD_LOCKED_REASON = 'This dashboard is locked';

export const DASHBOARD_NO_EDIT_PERMISSION_REASON =
	'You need read and update access on this dashboard to edit it';

export const DASHBOARD_NO_DELETE_PERMISSION_REASON =
	'You need delete access on this dashboard to delete it';

export const DASHBOARD_NO_CREATE_PERMISSION_REASON =
	'You need create access on dashboards';

export const DASHBOARD_NO_LIST_PERMISSION_REASON =
	'You need list access on dashboards to browse them';

export const DASHBOARD_CLONE_DENIED_REASON =
	'Cloning needs read access on this dashboard and create access on dashboards';

export const DASHBOARD_LOCK_NOT_OWNER_REASON =
	'Only the dashboard creator or an org admin can lock or unlock this dashboard';

export const DASHBOARD_LOCK_INTEGRATION_REASON =
	'Dashboards created by integrations cannot be unlocked';

export const DASHBOARD_NO_PUBLISH_PERMISSION_REASON =
	'You need read and update access on this dashboard to change its public link';
