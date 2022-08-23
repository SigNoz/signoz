import apiV1 from 'api/apiV1';
import getLocalStorageKey from 'api/browser/localstorage/get';
import { ENVIRONMENT } from 'constants/env';
import { LOCALSTORAGE } from 'constants/localStorage';
import { EventSourcePolyfill } from 'event-source-polyfill';

export const LiveTail = (queryParams: string): EventSourcePolyfill => {
	const dict = {
		headers: {
			Authorization: `Bearer ${getLocalStorageKey(LOCALSTORAGE.AUTH_TOKEN)}`,
		},
	};
	return new EventSourcePolyfill(
		`${ENVIRONMENT.baseURL}${apiV1}logs/tail?${queryParams}`,
		dict,
	);
};
