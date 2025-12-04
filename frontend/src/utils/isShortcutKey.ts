import { KeyboardEvent, MouseEvent } from 'react';

export const isShortcutKey = (
	event:
		| MouseEvent
		| KeyboardEvent
		| globalThis.MouseEvent
		| globalThis.KeyboardEvent,
): boolean => event.metaKey || event.ctrlKey;
