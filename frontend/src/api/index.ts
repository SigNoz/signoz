/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-explicit-any */
import getLocalStorageApi from 'api/browser/localstorage/get';
import loginApi from 'api/user/login';
import afterLogin from 'AppRoutes/utils';
import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ENVIRONMENT } from 'constants/env';
import { LOCALSTORAGE } from 'constants/localStorage';
import store from 'store';

import apiV1, { apiAlertManager, apiV2, apiV3 } from './apiV1';
import { Logout } from './utils';

const interceptorsResponse = (
	value: AxiosResponse<any>,
): Promise<AxiosResponse<any>> => Promise.resolve(value);

const interceptorsRequestResponse = (
	value: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig => {
	const token =
		store.getState().app.user?.accessJwt ||
		getLocalStorageApi(LOCALSTORAGE.AUTH_TOKEN) ||
		'';

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
			// reject the refresh token error
			if (response.status === 401 && response.config.url !== '/login') {
				const response = await loginApi({
					refreshToken: store.getState().app.user?.refreshJwt,
				});

				if (response.statusCode === 200) {
					const user = await afterLogin(
						response.payload.userId,
						response.payload.accessJwt,
						response.payload.refreshJwt,
					);

					if (user) {
						const reResponse = await axios(
							`${value.config.baseURL}${value.config.url?.substring(1)}`,
							{
								method: value.config.method,
								headers: {
									...value.config.headers,
									Authorization: `Bearer ${response.payload.accessJwt}`,
								},
								data: {
									...JSON.parse(value.config.data || '{}'),
								},
							},
						);

						if (reResponse.status === 200) {
							return await Promise.resolve(reResponse);
						}
						Logout();

						return await Promise.reject(reResponse);
					}
					Logout();

					return await Promise.reject(value);
				}
				Logout();
			}

			// when refresh token is expired
			if (response.status === 401 && response.config.url === '/login') {
				Logout();
			}
		}
		return await Promise.reject(value);
	} catch (error) {
		return await Promise.reject(error);
	}
};

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

AxiosAlertManagerInstance.interceptors.response.use(
	interceptorsResponse,
	interceptorRejected,
);
AxiosAlertManagerInstance.interceptors.request.use(interceptorsRequestResponse);

export { apiV1 };
export default instance;
