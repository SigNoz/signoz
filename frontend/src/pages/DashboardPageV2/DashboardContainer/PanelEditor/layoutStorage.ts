import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';

/**
 * `Storage`-shaped adapter for `useDefaultLayout`, backed by the scoped localStorage
 * wrappers that prefix keys with the URL base path so layout stays isolated per deployment.
 */
const layoutStorage: Pick<Storage, 'getItem' | 'setItem'> = {
	getItem: (key: string): string | null => getLocalStorageApi(key),
	setItem: (key: string, value: string): void => {
		setLocalStorageApi(key, value);
	},
};

export default layoutStorage;
