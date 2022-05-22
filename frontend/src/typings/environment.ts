/* eslint-disable @typescript-eslint/no-namespace */
declare global {
	namespace NodeJS {
		interface ProcessEnv {
			FRONTEND_API_ENDPOINT: string | undefined;
			FRONTEND_API_BASE_ENDPOINT: string | undefined;
			NODE_ENV: 'development' | 'production' | 'test';
		}
	}
}

export {};
