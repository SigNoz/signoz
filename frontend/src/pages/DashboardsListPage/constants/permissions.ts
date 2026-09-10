import { DashboardListPermission } from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';

// `list` authorizes the table, the saved views and the filters alike: they all
// reach the same endpoint, so every one of them is gated on this single check.
export const LIST_CHECKS = [DashboardListPermission];
