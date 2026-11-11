import { withBasePath } from 'utils/basePath';

export const openInNewTab = (path: string, newTab = true): void => {
	if (newTab) {
		window.open(withBasePath(path), '_blank');
	} else {
		window.location.assign(withBasePath(path));
	}
};
