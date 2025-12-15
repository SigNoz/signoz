import history from 'lib/history';
import { KeyboardEvent, MouseEvent } from 'react';
import { isCtrlOrMMetaKey } from 'utils/isShortcutKey';

export const genericNavigate = (
	link: string,
	event?:
		| MouseEvent
		| KeyboardEvent
		| globalThis.MouseEvent
		| globalThis.KeyboardEvent,
): void => {
	if (event && isCtrlOrMMetaKey(event)) {
		window.open(link, '_blank', 'noopener,noreferrer');
	} else {
		history.push(link);
	}
};
