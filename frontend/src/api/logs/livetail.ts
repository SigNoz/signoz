import getLocalStorageKey from 'api/browser/localstorage/get';
import { LOCALSTORAGE } from 'constants/localStorage';

export const LiveTail = () => {
	const dict = {
		headers: {
			Authorization: `Bearer ${getLocalStorageKey(LOCALSTORAGE.AUTH_TOKEN)}`,
		},
	};
	return new EventSource(
		'http://localhost:3000/subscription/topic%20B',
		// 'http://44.205.25.234:3301/api/v1/logs/tail',
	);
};
