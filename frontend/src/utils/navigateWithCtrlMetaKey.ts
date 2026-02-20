import React from 'react';

export function isMetaOrCtrlKey(
	event: React.MouseEvent | React.KeyboardEvent | MouseEvent | KeyboardEvent,
): boolean {
	return event.metaKey || event.ctrlKey;
}

export function navigateWithCtrlMetaKey(
	event: React.MouseEvent | MouseEvent,
	url: string,
	navigateFn: (url: string) => void,
): void {
	if (isMetaOrCtrlKey(event)) {
		window.open(url, '_blank');
		return;
	}
	navigateFn(url);
}
