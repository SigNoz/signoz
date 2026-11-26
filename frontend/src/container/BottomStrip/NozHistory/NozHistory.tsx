import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { Button } from '@signozhq/ui/button';
import {
	Popover,
	type PopoverProps,
	usePopoverHandle,
} from '@signozhq/ui/popover';
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

import { isSupportChatTarget } from '../SupportButton/supportChat';
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
	const { clearance } = usePopoverAvoidance(AVOID, isOpen);
	const history = usePopoverHandle(setHistoryOpen);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const shownClearance = useRef(0);

	// The support chat stays open over the strip, so the list keeps left of it.
	const showHistory = useCallback((): void => {
		const trigger = triggerRef.current;
		if (!trigger) {
			return;
		}
		shownClearance.current = clearance;
		const rect = trigger.getBoundingClientRect();
		const maxRight = window.innerWidth - clearance;
		history.showAt(
			rect.right <= maxRight
				? trigger
				: new DOMRect(maxRight - rect.width, rect.top, rect.width, rect.height),
		);
	}, [clearance, history]);

	// Before paint, so the list opens beside the support chat instead of sliding there.
	useLayoutEffect(() => {
		if (isOpen && history.isOpen && shownClearance.current !== clearance) {
			showHistory();
		} else if (!isOpen && history.isOpen) {
			history.close();
		}
	}, [clearance, history, isOpen, showHistory]);

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

	// The support chat opens beside the list rather than closing it; the trigger toggles it.
	const handleOpenChange = useCallback<
		NonNullable<PopoverProps['onOpenChange']>
	>((open, { reason, event, cancel }) => {
		// Focus-out names the element losing focus; where it goes is the relatedTarget.
		const towards =
			reason === 'focus-out' && event instanceof FocusEvent
				? event.relatedTarget
				: (event?.target ?? null);
		if (
			!open &&
			(isSupportChatTarget(towards) ||
				(towards instanceof Node && triggerRef.current?.contains(towards)))
		) {
			cancel();
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
			<Tooltip title="Recent conversations">
				<Button
					ref={triggerRef}
					variant="ghost"
					color="secondary"
					size="sm"
					icon
					aria-label="Recent conversations"
					aria-haspopup="dialog"
					aria-expanded={isOpen}
					onClick={(): void => (isOpen ? history.close() : showHistory())}
					testId="noz-history-trigger"
				>
					<FolderClock size={16} />
				</Button>
			</Tooltip>
			<Popover
				handle={history}
				side="top"
				align="end"
				width={269}
				onOpenChange={handleOpenChange}
				aria-label="Recent conversations"
			>
				<NozHistoryList conversations={recent} onSelect={handleSelect} />
			</Popover>
		</div>
	);
}

export default NozHistory;
