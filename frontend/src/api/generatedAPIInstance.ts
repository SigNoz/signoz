import {
	interceptorRejected,
	interceptorsRequestBasePath,
	interceptorsRequestResponse,
	interceptorsResponse,
} from 'api';
import { ENVIRONMENT } from 'constants/env';

import axios, { AxiosError, AxiosRequestConfig } from 'axios';

// generated API Instance
const generatedAPIAxiosInstance = axios.create({
	baseURL: ENVIRONMENT.baseURL,
	// The backend binds repeated keys (`states=a&states=b`); axios' default sends `states[]=`.
	paramsSerializer: { indexes: null },
});

export const GeneratedAPIInstance = <T>(
	config: AxiosRequestConfig,
): Promise<T> => {
	return generatedAPIAxiosInstance({ ...config }).then(({ data }) => data);
};

generatedAPIAxiosInstance.interceptors.request.use(interceptorsRequestBasePath);
generatedAPIAxiosInstance.interceptors.request.use(interceptorsRequestResponse);
generatedAPIAxiosInstance.interceptors.request.use(interceptorsRequestBasePath);
generatedAPIAxiosInstance.interceptors.response.use(
	interceptorsResponse,
	interceptorRejected,
);

export type ErrorType<Error> = AxiosError<Error>;
export type BodyType<BodyData> = BodyData;
