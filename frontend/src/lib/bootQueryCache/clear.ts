import removeLocalStorageKey from 'api/browser/localstorage/remove';
import { LOCALSTORAGE } from 'constants/localStorage';

export const clearBootQueryCache = (): void => {
	removeLocalStorageKey(LOCALSTORAGE.BOOT_QUERY_CACHE);
};
