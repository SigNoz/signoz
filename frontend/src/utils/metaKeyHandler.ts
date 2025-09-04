import history from 'lib/history';

/**
 * Checks if the meta key (Cmd on Mac) or Ctrl key is pressed
 * @param event MouseEvent or KeyboardEvent
 * @returns boolean indicating if meta/ctrl key is pressed
 */
export const isMetaKeyPressed = (
	event: React.MouseEvent | MouseEvent | KeyboardEvent,
): boolean => event.metaKey || event.ctrlKey;

/**
 * Handles navigation with support for opening in new tab when meta/ctrl key is pressed
 * @param path The path to navigate to
 * @param event The mouse or keyboard event
 * @param openInNewTab Optional flag to force opening in new tab
 */
export const handleNavigateWithMetaKey = (
	path: string,
	event?: React.MouseEvent | MouseEvent | KeyboardEvent,
	openInNewTab = false,
): void => {
	if (openInNewTab || (event && isMetaKeyPressed(event))) {
		window.open(path, '_blank');
	} else {
		history.push(path);
	}
};

/**
 * Creates a click handler that supports meta/ctrl key navigation
 * @param path The path to navigate to
 * @param beforeNavigate Optional callback to run before navigation
 * @returns Click event handler
 */
export const createMetaKeyNavigationHandler = (
	path: string | (() => string),
	beforeNavigate?: (event: React.MouseEvent<HTMLElement>) => void,
): ((event: React.MouseEvent<HTMLElement>) => void) => (
	event: React.MouseEvent<HTMLElement>,
): void => {
	event.preventDefault();
	event.stopPropagation();

	if (beforeNavigate) {
		beforeNavigate(event);
	}

	const targetPath = typeof path === 'function' ? path() : path;
	handleNavigateWithMetaKey(targetPath, event);
};

/**
 * Higher-order function that wraps an existing onClick handler
 * to add meta/ctrl key support for opening in new tab
 * @param path The path to navigate to
 * @param existingHandler Optional existing click handler
 * @returns Enhanced click handler with meta key support
 */
export const enhanceWithMetaKeyNavigation = (
	path: string | (() => string),
	existingHandler?: (event: React.MouseEvent<HTMLElement>) => void,
): ((event: React.MouseEvent<HTMLElement>) => void) => (
	event: React.MouseEvent<HTMLElement>,
): void => {
	const targetPath = typeof path === 'function' ? path() : path;

	if (isMetaKeyPressed(event)) {
		event.preventDefault();
		event.stopPropagation();
		window.open(targetPath, '_blank');
	} else if (existingHandler) {
		existingHandler(event);
	} else {
		history.push(targetPath);
	}
};

/**
 * Props helper for table row navigation with meta key support
 * @param path The path to navigate to
 * @param onBeforeNavigate Optional callback before navigation
 * @returns Object with onClick handler for table row
 */
export const getTableRowNavigationProps = (
	path: string | (() => string),
	onBeforeNavigate?: () => void,
): { onClick: (event: React.MouseEvent) => void } => ({
	onClick: (event: React.MouseEvent): void => {
		const targetPath = typeof path === 'function' ? path() : path;

		if (onBeforeNavigate) {
			onBeforeNavigate();
		}

		handleNavigateWithMetaKey(targetPath, event);
	},
});
