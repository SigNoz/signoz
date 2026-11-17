import { useMemo } from 'react';
import ROUTES from 'constants/routes';
import { useIsAIAssistantEnabled } from 'hooks/useIsAIAssistantEnabled';
import { useAppLocation } from 'lib/router/useAppLocation';

import StripTabs from '../components/StripTabs/StripTabs';
import type { StripTabItem } from '../types';
import { useNozActiveChats } from './useNozActiveChats';
import { useNozReplySound } from './useNozReplySound';

import styles from './NozActiveChat.module.scss';

const UNTITLED = 'New conversation';

/** One tab per open Noz conversation; a dot marks an unseen reply. */
function NozActiveChat(): JSX.Element | null {
	const { pathname } = useAppLocation();
	const isAIAssistantEnabled = useIsAIAssistantEnabled();
	const { chats, openChat, closeChat } = useNozActiveChats();
	useNozReplySound();

	const items = useMemo(
		() =>
			chats.map((chat): StripTabItem => {
				const title = chat.title ?? UNTITLED;
				return {
					id: chat.threadId,
					label: title,
					isActive: chat.isActive,
					prefix: chat.hasUnreadReply ? (
						<span className={styles.unreadDot} aria-hidden />
					) : undefined,
					ariaLabel: chat.hasUnreadReply ? `Noz replied in ${title}` : undefined,
				};
			}),
		[chats],
	);

	// The drawer does not render on the Noz full page.
	if (!isAIAssistantEnabled || pathname.startsWith(ROUTES.AI_ASSISTANT_BASE)) {
		return null;
	}

	return (
		<StripTabs
			items={items}
			onSelect={openChat}
			onClose={closeChat}
			testId="bottom-strip-noz-chats"
		/>
	);
}

export default NozActiveChat;
