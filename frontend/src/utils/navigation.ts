import React from 'react';

/**
 * Returns true if the user is holding Cmd (Mac) or Ctrl (Windows/Linux)
 * during a click event, or if the middle mouse button is used —
 * the universal "open in new tab" modifiers.
 */
export const isModifierKeyPressed = (
	event: MouseEvent | React.MouseEvent,
): boolean => event.metaKey || event.ctrlKey || event.button === 1;

/**
 * Opens the given path in a new browser tab.
 */
export const openInNewTab = (path: string): void => {
	window.open(path, '_blank');
};
