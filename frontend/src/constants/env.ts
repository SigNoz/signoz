export const ENVIRONMENT = {
	baseURL:
		process?.env?.FRONTEND_API_ENDPOINT ||
		process?.env?.GITPOD_WORKSPACE_URL?.replace('://', '://8080-') ||
		'https://app.us.staging.signoz.cloud',
	wsURL: process?.env?.WEBSOCKET_API_ENDPOINT || '',
};
