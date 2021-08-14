import axios, { AxiosRequestConfig } from 'axios';
import { ENVIRONMENT } from 'Src/constants/env';
import apiV1 from './apiV1';

export default axios.create({
	baseURL: `${ENVIRONMENT.baseURL}`,
});

export { apiV1 };
