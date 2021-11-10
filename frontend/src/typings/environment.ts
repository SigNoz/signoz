declare global {
	namespace NodeJS {
		interface ProcessEnv {
			FRONTEND_API_ENDPOINT: string | undefined;
			ALERT_MANAGER_ENDPOINT: string | undefined;
		}
	}
}

export {};
