import { useMemo } from 'react';
import ROUTES from 'constants/routes';
import { useAIAssistantActiveChats } from 'container/AIAssistant/hooks/useAIAssistantActiveChats';
import { useIsAIAssistantEnabled } from 'hooks/useIsAIAssistantEnabled';
import { matchRoute } from 'lib/router/matchRoute';
import { useAppLocation } from 'lib/router/useAppLocation';

import StripTabs from '../components/StripTabs/StripTabs';
import type { StripTabItem } from '../types';

import styles from './NozActiveChat.module.scss';

const UNTITLED = 'New conversation';

/** One tab per open Noz conversation; a dot marks an unseen reply or Noz waiting on the user. */
function NozActiveChat(): JSX.Element | null {
	const { pathname } = useAppLocation();
	const isAIAssistantEnabled = useIsAIAssistantEnabled();
	const isAIAssistantPage = !!matchRoute(pathname, ROUTES.AI_ASSISTANT, {
		exact: true,
	});
	const { chats, openChat, closeChat } =
		useAIAssistantActiveChats(isAIAssistantPage);

	const items = useMemo(
		() =>
			chats.map((chat): StripTabItem => {
				const title = chat.title ?? UNTITLED;
				let ariaLabel: string | undefined;
				if (chat.isAwaitingUser) {
					ariaLabel = `Noz needs your response in ${title}`;
				} else if (chat.hasUnreadReply) {
					ariaLabel = `Noz replied in ${title}`;
				}
				return {
					id: chat.threadId,
					label: title,
					isActive: chat.isActive,
					prefix: ariaLabel ? (
						<span className={styles.dot} aria-hidden />
					) : undefined,
					ariaLabel,
				};
			}),
		[chats],
	);

	if (!isAIAssistantEnabled) {
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
