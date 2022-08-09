import 'eventsource/example/eventsource-polyfill';

import apiV1 from 'api/apiV1';
import getLocalStorageKey from 'api/browser/localstorage/get';
import { ENVIRONMENT } from 'constants/env';
import { LOCALSTORAGE } from 'constants/localStorage';

export const LiveTail = (queryParams) => {
	const dict = {
		headers: {
			Authorization: `Bearer ${getLocalStorageKey(LOCALSTORAGE.AUTH_TOKEN)}`,
		},
	};
	return new EventSourcePolyfill(
		`${ENVIRONMENT.baseURL}${apiV1}/logs/tail?${queryParams}`,
		dict,
	);
};
