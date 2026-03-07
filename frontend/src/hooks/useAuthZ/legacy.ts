import { buildPermission } from './utils';

export const IsAdminPermission = buildPermission(
	'assignee',
	'role:signoz-admin',
);
export const IsEditorPermission = buildPermission(
	'assignee',
	'role:signoz-editor',
);
export const IsViewerPermission = buildPermission(
	'assignee',
	'role:signoz-viewer',
);
export const IsAnonymousPermission = buildPermission(
	'assignee',
	'role:signoz-anonymous',
);
