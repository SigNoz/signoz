/* eslint-disable @typescript-eslint/no-namespace */
declare global {
	namespace NodeJS {
		interface ProcessEnv {
			FRONTEND_API_ENDPOINT: string | undefined;
			WEBSOCKET_API_ENDPOINT: string | undefined;
		}
	}
}

export {};
