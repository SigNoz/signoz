import { DashboardListPermission } from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';

// The table, the saved views and the filters all reach the same endpoint, so one
// check gates them all.
export const LIST_CHECKS = [DashboardListPermission];
