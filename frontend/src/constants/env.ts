export const ENVIRONMENT = {
	baseURL:
		'http://3.146.152.151:3301' ||
		process?.env?.FRONTEND_API_ENDPOINT ||
		process?.env?.GITPOD_WORKSPACE_URL?.replace('://', '://8080-') ||
		'',
};
