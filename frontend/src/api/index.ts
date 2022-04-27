import axios, { AxiosInstance } from 'axios';
import { ENVIRONMENT } from 'constants/env';
import store from 'store';

import apiV1, { apiV2 } from './apiV1';
import { Logout } from './utils';

const handleLogoutInterceptor = (instance: AxiosInstance): void => {
	instance.interceptors.response.use((value) => {
		if (value.status === 401) {
			// token is expired
			Logout();
		}
		return value;
	});
};

const instance = axios.create({
	baseURL: `${ENVIRONMENT.baseURL}${apiV1}`,
	headers: {
		Authorization: `bearer ${store.getState().app.user?.accessJwt || ''}`,
	},
});

handleLogoutInterceptor(instance);

export default instance;

export const AxiosAlertManagerInstance = axios.create({
	baseURL: `${ENVIRONMENT.baseURL}${apiV2}`,
	headers: {
		Authorization: `bearer ${store.getState().app.user?.accessJwt || ''}`,
	},
});

handleLogoutInterceptor(AxiosAlertManagerInstance);

export { apiV1 };
