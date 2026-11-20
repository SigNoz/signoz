import { SUPPORT_CHAT_SELECTOR } from './supportChatObstacle';

const SUPPORT_CHAT_TRIGGER_SELECTOR = '[data-support-chat-trigger]';

/** Whether an event came from the support chat or the button that opens it. */
export function isSupportChatEvent(event: Event): boolean {
	return (
		event.target instanceof Element &&
		Boolean(
			event.target.closest(
				`${SUPPORT_CHAT_SELECTOR}, ${SUPPORT_CHAT_TRIGGER_SELECTOR}`,
			),
		)
	);
}
