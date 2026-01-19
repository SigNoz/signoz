/**
 * Custom Axios instance for Orval generated API hooks.
 * This integrates with the existing auth interceptors.
 */
import type { AxiosError, AxiosRequestConfig } from 'axios';
import Axios from 'axios';

import { generatedAPIInstance } from '../../index';

/**
 * Custom instance wrapper for Orval.
 * Uses the existing axios instance which has auth interceptors configured:
 * - Auth token injection
 * - Token refresh on 401
 * - Response timing warnings
 */
export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
	const source = Axios.CancelToken.source();

	const promise = generatedAPIInstance({
		...config,
		cancelToken: source.token,
	}).then(({ data }) => data);

	// @ts-expect-error - Adding cancel method for React Query
	promise.cancel = (): void => {
		source.cancel('Query was cancelled');
	};

	return promise;
};

export default customInstance;

export type ErrorType<Error> = AxiosError<Error>;
export type BodyType<BodyData> = BodyData;
