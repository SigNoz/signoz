/// <reference types="vite/client" />

declare module '*.md' {
	const content: string;
	export default content;
}

declare module '*.md?raw' {
	const content: string;
	export default content;
}

interface ImportMetaEnv {
	readonly VITE_FRONTEND_API_ENDPOINT: string;
	readonly VITE_WEBSOCKET_API_ENDPOINT: string;
	readonly VITE_PYLON_APP_ID: string;
	readonly VITE_PYLON_IDENTITY_SECRET: string;
	readonly VITE_APPCUES_APP_ID: string;
	readonly VITE_POSTHOG_KEY: string;
	readonly VITE_SENTRY_AUTH_TOKEN: string;
	readonly VITE_SENTRY_ORG: string;
	readonly VITE_SENTRY_PROJECT_ID: string;
	readonly VITE_SENTRY_DSN: string;
	readonly VITE_TUNNEL_URL: string;
	readonly VITE_TUNNEL_DOMAIN: string;
	readonly VITE_DOCS_BASE_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
