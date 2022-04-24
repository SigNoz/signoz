import axios from 'axios';
import { ENVIRONMENT } from 'constants/env';
import store from 'store';

import apiV1, { apiV2 } from './apiV1';

export default axios.create({
	baseURL: `${ENVIRONMENT.baseURL}${apiV1}`,
	headers: {
		Authorization: `bearer ${store.getState().app.user?.accessJwt || ''}`,
	},
	withCredentials: true,
});

export const AxiosAlertManagerInstance = axios.create({
	baseURL: `${ENVIRONMENT.baseURL}${apiV2}`,
	headers: {
		Authorization: `bearer ${store.getState().app.user?.accessJwt || ''}`,
	},
	withCredentials: true,
});

export { apiV1 };
