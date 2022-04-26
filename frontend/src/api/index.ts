import axios, { AxiosInstance } from 'axios';
import { ENVIRONMENT } from 'constants/env';
import store from 'store';

import apiV1, { apiV2 } from './apiV1';

export default (): AxiosInstance => {
	return axios.create({
		baseURL: `${ENVIRONMENT.baseURL}${apiV1}`,
		headers: {
			Authorization: `bearer ${store.getState().app.user?.accessJwt || ''}`,
		},
	});
};

export const AxiosAlertManagerInstance = (): AxiosInstance => {
	return axios.create({
		baseURL: `${ENVIRONMENT.baseURL}${apiV2}`,
		headers: {
			Authorization: `bearer ${store.getState().app.user?.accessJwt || ''}`,
		},
	});
};

export { apiV1 };
