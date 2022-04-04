import getLocalStorageKey from 'api/browser/localstorage/get';

import { AppMode } from './setTheme';

const getTheme = (): AppMode => {
	const userTheme = getLocalStorageKey('theme');
	if (userTheme === null || userTheme === 'darkMode') {
		return 'darkMode';
	}

	return 'lightMode';
};

export default getTheme;
