import getLocalStorageKey from 'api/browser/localstorage/get';

const getTheme = (): appMode => {
	const userTheme = getLocalStorageKey('theme');
	if (userTheme === null || userTheme === 'darkMode') {
		return 'darkMode';
	}

	return 'lightMode';
};

type appMode = 'darkMode' | 'lightMode';

export default getTheme;
