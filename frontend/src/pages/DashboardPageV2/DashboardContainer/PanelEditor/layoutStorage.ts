import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';

/**
 * `Storage`-shaped adapter (just `getItem`/`setItem`, which is all
 * `useDefaultLayout` consumes) backed by the scoped localStorage wrappers. The
 * wrappers prefix keys with the URL base path, so the persisted resizable
 * layout stays isolated per deployment instead of touching the raw global.
 */
const layoutStorage: Pick<Storage, 'getItem' | 'setItem'> = {
	getItem: (key: string): string | null => getLocalStorageApi(key),
	setItem: (key: string, value: string): void => {
		setLocalStorageApi(key, value);
	},
};

export default layoutStorage;
