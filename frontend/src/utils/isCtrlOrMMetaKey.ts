import { KeyboardEvent, MouseEvent } from 'react';

export const isCtrlOrMMetaKey = (
	event:
		| MouseEvent
		| KeyboardEvent
		| globalThis.MouseEvent
		| globalThis.KeyboardEvent,
): boolean => event.metaKey || event.ctrlKey;
