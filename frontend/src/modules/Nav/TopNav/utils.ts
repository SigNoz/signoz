import ROUTES from 'Src/constants/routes';

export const getLocalStorageRouteKey = (pathName: string) => {
	let localStorageKey = '';
	const pathNameSplit = pathName.split('/');
	if (!pathNameSplit[2]) {
		localStorageKey = pathName;
	} else {
		Object.keys(ROUTES).forEach((key) => {
			if (ROUTES[key].indexOf(':') > -1) {
				if (ROUTES[key].indexOf(pathNameSplit[1]) > -1) {
					localStorageKey = ROUTES[key];
				}
			}
		});
	}
	return localStorageKey;
};
