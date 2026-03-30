/**
 * Opens the given path in a new browser tab.
 */
export const openInNewTab = (path: string): void => {
	window.open(path, '_blank');
};
