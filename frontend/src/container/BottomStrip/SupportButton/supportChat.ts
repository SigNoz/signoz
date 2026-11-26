import { SUPPORT_CHAT_SELECTOR } from './supportChatObstacle';

const SUPPORT_CHAT_TRIGGER_SELECTOR = '[data-support-chat-trigger]';

/** Whether `target` is the support chat or the button that opens it. */
export function isSupportChatTarget(target: EventTarget | null): boolean {
	return (
		target instanceof Element &&
		Boolean(
			target.closest(`${SUPPORT_CHAT_SELECTOR}, ${SUPPORT_CHAT_TRIGGER_SELECTOR}`),
		)
	);
}
