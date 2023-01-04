import apiV1 from 'api/apiV1';
import getLocalStorageKey from 'api/browser/localstorage/get';
import { ENVIRONMENT } from 'constants/env';
import { LOCALSTORAGE } from 'constants/localStorage';
import { EventSourcePolyfill } from 'event-source-polyfill';

// 10 min in ms
const TIMEOUT_IN_MS = 10 * 60 * 1000;

export const LiveTail = (queryParams: string): EventSourcePolyfill =>
	new EventSourcePolyfill(
		`${ENVIRONMENT.baseURL}${apiV1}logs/tail?${queryParams}`,
		{
			headers: {
				Authorization: `Bearer ${getLocalStorageKey(LOCALSTORAGE.AUTH_TOKEN)}`,
			},
			heartbeatTimeout: TIMEOUT_IN_MS,
		},
	);
