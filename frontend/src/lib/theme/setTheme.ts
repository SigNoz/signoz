import setLocalStorageKey from 'api/browser/localstorage/set';

const setTheme = (value: AppMode): void => {
	setLocalStorageKey('theme', value);
};

export type AppMode = 'darkMode' | 'lightMode';

export default setTheme;
