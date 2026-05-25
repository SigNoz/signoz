import { withBasePath } from 'utils/basePath';

export const openInNewTab = (path: string): void => {
	window.open(withBasePath(path), '_blank');
};
