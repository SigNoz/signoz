// Copy for dashboard controls blocked by something that is *not* a permission.
// Denial messages for permission checks come from the authz components — never
// write custom copy for those.

export const DASHBOARD_LOCKED_REASON = 'This dashboard is locked';

export const DASHBOARD_LOCK_NOT_OWNER_REASON =
	'Only the dashboard creator or an org admin can lock or unlock this dashboard';

export const DASHBOARD_LOCK_INTEGRATION_REASON =
	'Dashboards created by integrations cannot be unlocked';

/** A mount that is deliberately view-only regardless of permissions. */
export const DASHBOARD_READ_ONLY_VIEW_REASON =
	'This dashboard is read-only here';
