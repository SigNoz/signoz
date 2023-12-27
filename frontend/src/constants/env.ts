export const ENVIRONMENT = {
	baseURL:
		// 'http://18.219.28.108:3301' ||
		process?.env?.FRONTEND_API_ENDPOINT ||
		process?.env?.GITPOD_WORKSPACE_URL?.replace('://', '://8080-') ||
		'',
};
