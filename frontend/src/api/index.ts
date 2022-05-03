/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-explicit-any */
import getLocalStorageApi from 'api/browser/localstorage/get';
import loginApi from 'api/user/login';
import afterLogin from 'AppRoutes/utils';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ENVIRONMENT } from 'constants/env';
import { LOCALSTORAGE } from 'constants/localStorage';
import store from 'store';

import apiV1, { apiAlertManager, apiV2 } from './apiV1';
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
	if (axios.isAxiosError(value) && value.response) {
		const { response } = value;
		console.log(response);
		// reject the refresh token error
		if (response.status === 401 && response.config.url !== '/login') {
			const response = await loginApi({
				refreshToken: store.getState().app.user?.accessJwt,
			});

			if (response.statusCode === 200) {
				await afterLogin(
					response.payload.userId,
					response.payload.accessJwt,
					response.payload.refreshJwt,
				);
			} else {
				Logout();
			}
		}

		// when refresh token is expired
		if (response.status === 401 && response.config.url === '/login') {
			Logout();
		}
	}
	return Promise.reject(value);
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

AxiosAlertManagerInstance.interceptors.response.use(
	interceptorsResponse,
	interceptorRejected,
);
AxiosAlertManagerInstance.interceptors.request.use(interceptorsRequestResponse);

export { apiV1 };
export default instance;
