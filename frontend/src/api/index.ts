/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-explicit-any */
import getLocalStorageApi from 'api/browser/localstorage/get';
import loginApi from 'api/user/login';
import afterLogin from 'AppRoutes/utils';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ENVIRONMENT } from 'constants/env';
import { LOCALSTORAGE } from 'constants/localStorage';
import store from 'store';

import apiV1, { apiAlertManager, apiV2, apiV3 } from './apiV1';
import { Logout } from './utils';

const interceptorsResponse = (
	value: AxiosResponse<any>,
): Promise<AxiosResponse<any>> => Promise.resolve(value);

const interceptorsRequestResponse = (
	value: AxiosRequestConfig,
): AxiosRequestConfig => {
	const token =
		store.getState().app.user?.accessJwt ||
		getLocalStorageApi(LOCALSTORAGE.AUTH_TOKEN) ||
		'';

	value.headers.Authorization = token ? `Bearer ${token}` : '';

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
				const loginApiResponse = await loginApi({
					refreshToken: store.getState().app.user?.refreshJwt,
				});

				if (loginApiResponse.statusCode === 200) {
					const user = await afterLogin(
						loginApiResponse.payload.userId,
						loginApiResponse.payload.accessJwt,
						loginApiResponse.payload.refreshJwt,
					);

					if (user) {
						const reResponse = await axios(
							`${value.config.baseURL}${value.config.url?.substring(1)}`,
							{
								method: value.config.method,
								headers: {
									...value.config.headers,
									Authorization: `Bearer ${loginApiResponse.payload.accessJwt}`,
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
				console.log('logging out ');
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

instance.interceptors.response.use(interceptorsResponse, interceptorRejected);
instance.interceptors.request.use(interceptorsRequestResponse);

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
