import { useCallback, useMemo } from 'react';
import cx from 'classnames';
import { Button } from '@signozhq/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@signozhq/ui/popover';
import { Tooltip } from '@signozhq/ui/tooltip';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import {
	AIAssistantEvents,
	AIAssistantOpenSource,
} from 'container/AIAssistant/events';
import { normalizePage } from 'container/AIAssistant/hooks/useAIAssistantAnalyticsContext';
import { useOpenConversation } from 'container/AIAssistant/hooks/useOpenConversation';
import {
	openAIAssistant,
	useAIAssistantStore,
} from 'container/AIAssistant/store/useAIAssistantStore';
import { Conversation } from 'container/AIAssistant/types';
import { useIsAIAssistantEnabled } from 'hooks/useIsAIAssistantEnabled';
import { matchRoute } from 'lib/router/matchRoute';
import { useAppLocation } from 'lib/router/useAppLocation';
import { usePopoverAvoidance } from 'lib/obstacles/usePopoverAvoidance';
import { FolderClock } from '@signozhq/icons';

import { isSupportChatEvent } from '../SupportButton/supportChat';
import { supportChatObstacle } from '../SupportButton/supportChatObstacle';
import NozHistoryList from './NozHistoryList';

import styles from './NozHistory.module.scss';

const AVOID = [supportChatObstacle];

/** Recent Noz conversations from any page; AppLayout has already loaded them. */
function NozHistory(): JSX.Element | null {
	const { pathname } = useAppLocation();
	const isAIAssistantEnabled = useIsAIAssistantEnabled();
	const conversations = useAIAssistantStore((s) => s.conversations);
	const isDrawerOpen = useAIAssistantStore((s) => s.isDrawerOpen);
	const openConversation = useOpenConversation(
		AIAssistantOpenSource.BottomStrip,
	);
	const isOpen = useAIAssistantStore((s) => s.isHistoryOpen);
	const setHistoryOpen = useAIAssistantStore((s) => s.setHistoryOpen);
	const { collisionPadding, isSliding } = usePopoverAvoidance(AVOID, isOpen);

	// Chats saved on the server, newest first; unsent drafts don't count.
	const recent = useMemo(
		() =>
			Object.values(conversations)
				.filter((c) => c.threadId && !c.archived)
				.sort(
					(a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt),
				),
		[conversations],
	);

	const handleSelect = useCallback(
		(conversation: Conversation): void => {
			setHistoryOpen(false);
			openConversation(conversation.id);
			if (!isDrawerOpen) {
				void logEvent(AIAssistantEvents.Opened, {
					source: AIAssistantOpenSource.BottomStrip,
					currentPage: normalizePage(pathname),
				});
				openAIAssistant();
			}
		},
		[isDrawerOpen, openConversation, pathname, setHistoryOpen],
	);

	// The support chat opens beside the list rather than closing it.
	const handleInteractOutside = useCallback((event: Event): void => {
		if (isSupportChatEvent(event)) {
			event.preventDefault();
		}
	}, []);

	// The full page lists its chats in its own sidebar.
	const isAIAssistantPage = !!matchRoute(pathname, ROUTES.AI_ASSISTANT, {
		exact: true,
	});

	if (!isAIAssistantEnabled || isAIAssistantPage || recent.length === 0) {
		return null;
	}

	return (
		<div className={styles.nozHistory} data-testid="bottom-strip-noz-history">
			<Popover open={isOpen} onOpenChange={setHistoryOpen}>
				<Tooltip title="Recent conversations">
					<PopoverTrigger asChild>
						<Button
							variant="ghost"
							color="secondary"
							size="sm"
							icon
							aria-label="Recent conversations"
							testId="noz-history-trigger"
						>
							<FolderClock size={16} />
						</Button>
					</PopoverTrigger>
				</Tooltip>
				<PopoverContent
					className={cx(styles.popover, { [styles.isSliding]: isSliding })}
					side="top"
					align="end"
					sideOffset={4}
					// The support chat stays open over the strip, so the list keeps left of it.
					collisionPadding={collisionPadding}
					sticky="always"
					onInteractOutside={handleInteractOutside}
				>
					<NozHistoryList conversations={recent} onSelect={handleSelect} />
				</PopoverContent>
			</Popover>
		</div>
	);
}

export default NozHistory;
