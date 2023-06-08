import { apiV3 } from 'api/apiV1';

export const createApiUrl = (
	endpoint: string,
	apiVersion: string = apiV3,
): string =>
	new URL(
		endpoint,
		`${process.env.FRONTEND_API_ENDPOINT}${apiVersion}`,
	).toString();
