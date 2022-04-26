import axios from 'axios';
import { ENVIRONMENT } from 'constants/env';

import apiV1, { apiAlertManager, apiV2 } from './apiV1';

export default axios.create({
	baseURL: `${ENVIRONMENT.baseURL}${apiV1}`,
});

export const AxiosAlertManagerInstance = axios.create({
	baseURL: `${ENVIRONMENT.baseURL}${apiAlertManager}`,
});

export const ApiV2Instance = axios.create({
	baseURL: `${ENVIRONMENT.baseURL}${apiV2}`,
});

export { apiV1 };
