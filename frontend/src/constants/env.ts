export const ENVIRONMENT = {
	baseURL:
		process?.env?.FRONTEND_API_ENDPOINT ||
		process?.env?.GITPOD_WORKSPACE_URL?.replace('://', '://8080-') ||
		'',
	baseConstant: process?.env?.FRONTEND_BASE || '',
	NODE_ENV: process?.env?.NODE_ENV,
};
