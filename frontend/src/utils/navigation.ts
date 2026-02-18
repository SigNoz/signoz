import React from 'react';

/**
 * Returns true if the user is holding Cmd (Mac) or Ctrl (Windows/Linux)
 * during a click event — the universal "open in new tab" modifier.
 */
export const isModifierKeyPressed = (
	event: MouseEvent | React.MouseEvent,
): boolean => event.metaKey || event.ctrlKey;

/**
 * Opens the given path in a new browser tab.
 */
export const openInNewTab = (path: string): void => {
	window.open(path, '_blank');
};

/**
 * Navigates to a path, respecting modifier keys. If Cmd/Ctrl is held,
 * the path is opened in a new tab. Otherwise, the provided `navigate`
 * callback is invoked for SPA navigation.
 *
 * @param path - The target URL path
 * @param navigate - SPA navigation callback (e.g. history.push, safeNavigate)
 * @param event - Optional mouse event to check for modifier keys
 */
export const navigateToPage = (
	path: string,
	navigate: (path: string) => void,
	event?: MouseEvent | React.MouseEvent,
): void => {
	if (event && isModifierKeyPressed(event)) {
		openInNewTab(path);
	} else {
		navigate(path);
	}
};
