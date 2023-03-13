/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-explicit-any */
import getLocalStorageApi from 'api/browser/localstorage/get';
import loginApi from 'api/user/login';
import afterLogin from 'AppRoutes/utils';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
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
				console.log('logging out ');
				Logout();
			}
		}
		return await Promise.reject(value);
	} catch (error) {
		return await Promise.reject(error);
	}
};

const createInstance = (baseURL: string): AxiosInstance => {
	const instance = axios.create({
		baseURL,
	});
	instance.interceptors.response.use(interceptorsResponse, interceptorRejected);
	instance.interceptors.request.use(interceptorsRequestResponse);
	return instance;
};

const instance = createInstance(`${ENVIRONMENT.baseURL}${apiV1}`);
const AxiosAlertManagerInstance = createInstance(
	`${ENVIRONMENT.baseURL}${apiAlertManager}`,
);
const ApiV2Instance = createInstance(`${ENVIRONMENT.baseURL}${apiV2}`);
const ApiV3Instance = createInstance(`${ENVIRONMENT.baseURL}${apiV3}`);

export { apiV1, ApiV2Instance, ApiV3Instance, AxiosAlertManagerInstance };

export default instance;
