import { RefObject, useCallback } from 'react';

import { TOOL_CALL_ID_ATTR } from './utils';

import styles from './AIThreadMessage.module.scss';

const HIGHLIGHT_MS = 1500;

interface ToolCallLinks {
	isToolLinkEnabled: (toolCallId: string) => boolean;
	onToolLinkClick: (toolCallId: string) => void;
}

/** Links tool results to their calls in `rootRef`; enabled only for ids in `toolCallIds`. */
export function useToolCallLinks(
	rootRef: RefObject<HTMLElement>,
	toolCallIds: Set<string>,
): ToolCallLinks {
	const isToolLinkEnabled = useCallback(
		(toolCallId: string): boolean => toolCallIds.has(toolCallId),
		[toolCallIds],
	);

	const onToolLinkClick = useCallback(
		(toolCallId: string): void => {
			const target = rootRef.current?.querySelector<HTMLElement>(
				`[${TOOL_CALL_ID_ATTR}="${CSS.escape(toolCallId)}"]`,
			);
			if (!target) {
				return;
			}
			target.scrollIntoView({ behavior: 'smooth', block: 'center' });
			target.classList.add(styles.isHighlighted);
			window.setTimeout(
				() => target.classList.remove(styles.isHighlighted),
				HIGHLIGHT_MS,
			);
		},
		[rootRef],
	);

	return { isToolLinkEnabled, onToolLinkClick };
}
