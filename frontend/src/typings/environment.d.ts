declare global {
	namespace NodeJS {
		interface ProcessEnv {
			FRONTEND_API_ENDPOINT: string | undefined;
		}
	}
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
