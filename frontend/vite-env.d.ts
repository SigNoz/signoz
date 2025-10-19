/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_APP_TITLE: string;
	// Add other custom environment variables here
	readonly VITE_API_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
