import {
	interceptorRejected,
	interceptorsRequestResponse,
	interceptorsResponse,
} from 'api';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { ENVIRONMENT } from 'constants/env';

// generated API Instance
const generatedAPIAxiosInstance = axios.create({
	baseURL: ENVIRONMENT.baseURL,
});

export const GeneratedAPIInstance = <T>(
	config: AxiosRequestConfig,
): Promise<T> => {
	return generatedAPIAxiosInstance({ ...config }).then(({ data }) => data);
};

generatedAPIAxiosInstance.interceptors.request.use(interceptorsRequestResponse);
generatedAPIAxiosInstance.interceptors.response.use(
	interceptorsResponse,
	interceptorRejected,
);

export type ErrorType<Error> = AxiosError<Error>;
export type BodyType<BodyData> = BodyData;
