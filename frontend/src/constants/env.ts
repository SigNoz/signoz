export const ENVIRONMENT = {
	baseURL:
		process?.env?.FRONTEND_API_ENDPOINT ||
		process?.env?.GITPOD_WORKSPACE_URL?.replace('://', '://8080-') ||
		'',
	isProduction: process?.env?.NODE_ENV === 'production',
	NODE_ENV: process?.env?.NODE_ENV,
};
