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
	readonly VITE_BASE_PATH: string;
	readonly VITE_FRONTEND_API_ENDPOINT: string;
	readonly VITE_WEBSOCKET_API_ENDPOINT: string;
	readonly VITE_PYLON_ENABLED: string;
	readonly VITE_PYLON_APP_ID: string;
	readonly VITE_PYLON_IDENTITY_SECRET: string;
	readonly VITE_APPCUES_ENABLED: string;
	readonly VITE_APPCUES_APP_ID: string;
	readonly VITE_POSTHOG_ENABLED: string;
	readonly VITE_POSTHOG_API_HOST: string;
	readonly VITE_POSTHOG_KEY: string;
	readonly VITE_POSTHOG_UI_HOST: string;
	readonly VITE_SENTRY_AUTH_TOKEN: string;
	readonly VITE_SENTRY_ORG: string;
	readonly VITE_SENTRY_PROJECT_ID: string;
	readonly VITE_SENTRY_ENABLED: string;
	readonly VITE_SENTRY_TUNNEL: string;
	readonly VITE_SENTRY_DSN: string;
	readonly VITE_DOCS_BASE_URL: string;
	readonly VITE_ENVIRONMENT: string;
	readonly VITE_VERSION: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
