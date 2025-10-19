export const ENVIRONMENT = {
	baseURL:
		import.meta.env?.VITE_FRONTEND_API_ENDPOINT ||
		import.meta.env?.VITE_GITPOD_WORKSPACE_URL?.replace('://', '://8080-') ||
		'',
	wsURL: import.meta.env?.VITE_WEBSOCKET_API_ENDPOINT || '',
};
