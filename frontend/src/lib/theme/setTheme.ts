import setLocalStorageKey from 'api/browser/localstorage/set';

const setTheme = (value: appMode): void => {
	setLocalStorageKey('theme', value);
};

type appMode = 'darkMode' | 'lightMode';

export default setTheme;
