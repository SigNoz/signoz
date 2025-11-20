/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-explicit-any */
import getLocalStorageApi from 'api/browser/localstorage/get';
import post from 'api/v2/sessions/rotate/post';
import afterLogin from 'AppRoutes/utils';
import axios, {
	AxiosError,
	AxiosResponse,
	InternalAxiosRequestConfig,
} from 'axios';
import { ENVIRONMENT } from 'constants/env';
import { Events } from 'constants/events';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryClient } from 'react-query';
import { eventEmitter } from 'utils/getEventEmitter';

import apiV1, {
	apiAlertManager,
	apiV2,
	apiV3,
	apiV4,
	apiV5,
	gatewayApiV1,
	gatewayApiV2,
} from './apiV1';
import { Logout } from './utils';

const RESPONSE_TIMEOUT_THRESHOLD = 5000; // 5 seconds
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: false,
		},
	},
});

const interceptorsResponse = (
	value: AxiosResponse<any>,
): Promise<AxiosResponse<any>> => {
	if ((value.config as any)?.metadata) {
		const duration =
			new Date().getTime() - (value.config as any).metadata.startTime;

		if (duration > RESPONSE_TIMEOUT_THRESHOLD && value.config.url !== '/event') {
			eventEmitter.emit(Events.SLOW_API_WARNING, true, {
				duration,
				url: value.config.url,
				threshold: RESPONSE_TIMEOUT_THRESHOLD,
			});

			console.warn(
				`[API Warning] Request to ${value.config.url} took ${duration}ms`,
			);
		}
	}

	return Promise.resolve(value);
};

const interceptorsRequestResponse = (
	value: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig => {
	// Attach metadata safely (not sent with the request)
	Object.defineProperty(value, 'metadata', {
		value: { startTime: new Date().getTime() },
		enumerable: false, // Prevents it from being included in the request
	});

	const token = getLocalStorageApi(LOCALSTORAGE.AUTH_TOKEN) || '';

	if (value && value.headers) {
		value.headers.Authorization = token ? `Bearer ${token}` : '';
	}

	return value;
};

const interceptorRejected = async (
	value: AxiosResponse<any>,
): Promise<AxiosResponse<any>> => {
	try {
		if (axios.isAxiosError(value) && value.response) {
			const { response } = value;

			if (
				response.status === 401 &&
				// if the session rotate call or the create session errors out with 401 or the delete sessions call returns 401 then we do not retry!
				response.config.url !== '/sessions/rotate' &&
				response.config.url !== '/sessions/email_password' &&
				!(
					response.config.url === '/sessions' && response.config.method === 'delete'
				)
			) {
				try {
					const accessToken = getLocalStorageApi(LOCALSTORAGE.AUTH_TOKEN);
					const refreshToken = getLocalStorageApi(LOCALSTORAGE.REFRESH_AUTH_TOKEN);
					const response = await queryClient.fetchQuery({
						queryFn: () => post({ refreshToken: refreshToken || '' }),
						queryKey: ['/api/v2/sessions/rotate', accessToken, refreshToken],
					});

					afterLogin(response.data.accessToken, response.data.refreshToken, true);

					try {
						const reResponse = await axios(
							`${value.config.baseURL}${value.config.url?.substring(1)}`,
							{
								method: value.config.method,
								headers: {
									...value.config.headers,
									Authorization: `Bearer ${response.data.accessToken}`,
								},
								data: {
									...JSON.parse(value.config.data || '{}'),
								},
							},
						);

						return await Promise.resolve(reResponse);
					} catch (error) {
						if ((error as AxiosError)?.response?.status === 401) {
							Logout();
						}
					}
				} catch (error) {
					Logout();
				}
			}

			if (response.status === 401 && response.config.url === '/sessions/rotate') {
				Logout();
			}
		}
		return await Promise.reject(value);
	} catch (error) {
		return await Promise.reject(error);
	}
};

const interceptorRejectedBase = async (
	value: AxiosResponse<any>,
): Promise<AxiosResponse<any>> => Promise.reject(value);

const instance = axios.create({
	baseURL: `${ENVIRONMENT.baseURL}${apiV1}`,
});

instance.interceptors.request.use(interceptorsRequestResponse);
instance.interceptors.response.use(interceptorsResponse, interceptorRejected);

export const AxiosAlertManagerInstance = axios.create({
	baseURL: `${ENVIRONMENT.baseURL}${apiAlertManager}`,
});

export const ApiV2Instance = axios.create({
	baseURL: `${ENVIRONMENT.baseURL}${apiV2}`,
});
ApiV2Instance.interceptors.response.use(
	interceptorsResponse,
	interceptorRejected,
);
ApiV2Instance.interceptors.request.use(interceptorsRequestResponse);

// axios V3
export const ApiV3Instance = axios.create({
	baseURL: `${ENVIRONMENT.baseURL}${apiV3}`,
});

ApiV3Instance.interceptors.response.use(
	interceptorsResponse,
	interceptorRejected,
);
ApiV3Instance.interceptors.request.use(interceptorsRequestResponse);
//

// axios V4
export const ApiV4Instance = axios.create({
	baseURL: `${ENVIRONMENT.baseURL}${apiV4}`,
});

ApiV4Instance.interceptors.response.use(
	interceptorsResponse,
	interceptorRejected,
);
ApiV4Instance.interceptors.request.use(interceptorsRequestResponse);
//

// axios V5
export const ApiV5Instance = axios.create({
	baseURL: `${ENVIRONMENT.baseURL}${apiV5}`,
});

ApiV5Instance.interceptors.response.use(
	interceptorsResponse,
	interceptorRejected,
);
ApiV5Instance.interceptors.request.use(interceptorsRequestResponse);
//

// axios Base
export const LogEventAxiosInstance = axios.create({
	baseURL: `${ENVIRONMENT.baseURL}${apiV1}`,
});

LogEventAxiosInstance.interceptors.response.use(
	interceptorsResponse,
	interceptorRejectedBase,
);
LogEventAxiosInstance.interceptors.request.use(interceptorsRequestResponse);
//

// gateway Api V1
export const GatewayApiV1Instance = axios.create({
	baseURL: `${ENVIRONMENT.baseURL}${gatewayApiV1}`,
});

GatewayApiV1Instance.interceptors.response.use(
	interceptorsResponse,
	interceptorRejected,
);

GatewayApiV1Instance.interceptors.request.use(interceptorsRequestResponse);
//

// gateway Api V2
export const GatewayApiV2Instance = axios.create({
	baseURL: `${ENVIRONMENT.baseURL}${gatewayApiV2}`,
});

GatewayApiV2Instance.interceptors.response.use(
	interceptorsResponse,
	interceptorRejected,
);

GatewayApiV2Instance.interceptors.request.use(interceptorsRequestResponse);
//

AxiosAlertManagerInstance.interceptors.response.use(
	interceptorsResponse,
	interceptorRejected,
);
AxiosAlertManagerInstance.interceptors.request.use(interceptorsRequestResponse);

export { apiV1 };
export default instance;
