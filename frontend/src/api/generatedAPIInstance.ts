import {
	interceptorRejected,
	interceptorsRequestBasePath,
	interceptorsRequestResponse,
	interceptorsResponse,
} from 'api';
import { ENVIRONMENT } from 'constants/env';

import axios, { AxiosError, AxiosRequestConfig } from 'axios';

// generated API Instance
const generatedAPIAxiosInstance = axios.create({
	baseURL: ENVIRONMENT.baseURL,
});

let generatedAPIQueryKeyHeaderContext: Record<string, unknown> | undefined;

export const setGeneratedAPIQueryKeyHeaderContext = <THeaders extends object>(
	headers?: THeaders,
): void => {
	generatedAPIQueryKeyHeaderContext = headers
		? { ...(headers as Record<string, unknown>) }
		: undefined;
};

const hashHeaderValue = (value: string): string => {
	let hash = 0;

	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
	}

	return hash.toString(16);
};

const mergeHeaderRecord = (
	target: Record<string, unknown>,
	source: unknown,
): Record<string, unknown> => {
	if (!source || typeof source !== 'object') {
		return target;
	}

	return Object.assign(target, source as Record<string, unknown>);
};

export const GeneratedAPIInstance = <T>(
	config: AxiosRequestConfig,
): Promise<T> => {
	return generatedAPIAxiosInstance({ ...config }).then(({ data }) => data);
};

generatedAPIAxiosInstance.interceptors.request.use(interceptorsRequestBasePath);
generatedAPIAxiosInstance.interceptors.request.use(interceptorsRequestResponse);
generatedAPIAxiosInstance.interceptors.request.use(interceptorsRequestBasePath);
generatedAPIAxiosInstance.interceptors.response.use(
	interceptorsResponse,
	interceptorRejected,
);

const getDefaultQueryKeyHeaders = (): Record<string, unknown> => {
	const defaults = generatedAPIAxiosInstance.defaults
		.headers as unknown as Record<string, unknown>;
	const headers: Record<string, unknown> = {};
	const methodKeys = new Set([
		'common',
		'delete',
		'get',
		'head',
		'options',
		'patch',
		'post',
		'put',
	]);

	mergeHeaderRecord(headers, defaults?.common);
	mergeHeaderRecord(headers, defaults?.get);

	for (const [key, value] of Object.entries(defaults ?? {})) {
		if (!methodKeys.has(key)) {
			headers[key] = value;
		}
	}

	return headers;
};

export const getGeneratedAPIQueryKeyHeaders = <THeaders extends object>(
	headers?: THeaders,
): [{ headers: Record<string, unknown> }] | [] => {
	const mergedHeaders = {
		...getDefaultQueryKeyHeaders(),
		...generatedAPIQueryKeyHeaderContext,
		...(headers as Record<string, unknown> | undefined),
	};

	const queryKeyHeaders = Object.fromEntries(
		Object.entries(mergedHeaders)
			.filter(([, value]) => value !== undefined)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, value]) => {
				if (key.toLowerCase() === 'authorization' && typeof value === 'string') {
					return [key, hashHeaderValue(value)];
				}

				return [key, value];
			}),
	);

	return Object.keys(queryKeyHeaders).length
		? [{ headers: queryKeyHeaders }]
		: [];
};

export type ErrorType<Error> = AxiosError<Error>;
export type BodyType<BodyData> = BodyData;
