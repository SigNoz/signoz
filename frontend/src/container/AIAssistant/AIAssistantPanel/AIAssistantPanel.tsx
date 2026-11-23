import { useCallback, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { matchRoute } from 'lib/router/matchRoute';
import { navigate } from 'lib/router/navigation';
import { useAppLocation } from 'lib/router/useAppLocation';
import { Tooltip } from '@signozhq/ui/tooltip';
import ROUTES from 'constants/routes';
import { History, Maximize2, Plus, X } from '@signozhq/icons';
import Noz from 'components/Noz/Noz';
import { BOTTOM_STRIP_HEIGHT } from 'container/BottomStrip';
import { supportChatObstacle } from 'container/BottomStrip/SupportButton/supportChatObstacle';
import { FloatingPanel } from 'periscope/components/FloatingPanel';

import logEvent from 'api/common/logEvent';

import ConversationsList from '../components/ConversationsList';
import ConversationView from '../ConversationView';
import { AIAssistantEvents } from '../events';
import { useAIAssistantAnalyticsContext } from '../hooks/useAIAssistantAnalyticsContext';
import { useActiveChatTitle } from '../hooks/useActiveChatTitle';
import { useAIAssistantStore } from '../store/useAIAssistantStore';
import { VariantContext } from '../VariantContext';

import styles from './AIAssistantPanel.module.scss';

const PANEL_WIDTH = 420;
const PANEL_HEIGHT = 601;
const PANEL_MIN_WIDTH = 380;
const PANEL_MIN_HEIGHT = 500;
const PANEL_MARGIN = 8;
// Screen the default size was designed for; larger screens scale the panel up, keeping its shape.
const DESIGN_SCREEN = { width: 1440, height: 900 };
const PANEL_RESIZE_EDGES = {
	top: true,
	right: true,
	bottom: true,
	left: true,
	topRight: false,
	bottomRight: false,
	bottomLeft: false,
	topLeft: false,
};
const PANEL_AVOID = [supportChatObstacle];

export default function AIAssistantPanel(): JSX.Element | null {
	const { pathname, search } = useAppLocation();
	const [showHistory, setShowHistory] = useState(false);

	const isOpen = useAIAssistantStore((s) => s.isDrawerOpen);
	const isFullScreenPage = !!matchRoute(pathname, ROUTES.AI_ASSISTANT, {
		exact: true,
	});
	const activeConversationId = useAIAssistantStore(
		(s) => s.activeConversationId,
	);
	const closeDrawer = useAIAssistantStore((s) => s.closeDrawer);
	const startNewConversation = useAIAssistantStore(
		(s) => s.startNewConversation,
	);
	const analyticsCtx = useAIAssistantAnalyticsContext();
	const chatTitle = useActiveChatTitle();

	const handleExpand = useCallback(() => {
		if (!activeConversationId) {
			return;
		}
		closeDrawer();
		// Router state tells AIAssistantPage to skip its mount-time Opened fire:
		// the assistant was already open in the drawer, so this is a surface
		// switch, not a new open. `returnTo` is where its minimize button comes back to.
		navigate(
			ROUTES.AI_ASSISTANT.replace(':conversationId', activeConversationId),
			{ state: { fromInApp: true, returnTo: `${pathname}${search}` } },
		);
	}, [activeConversationId, closeDrawer, pathname, search]);

	const handleNew = useCallback(() => {
		void logEvent(AIAssistantEvents.NewChatClicked, {
			...analyticsCtx,
			// useAIAssistantAnalyticsContext() runs above this component's
			// VariantContext.Provider, so the hook reports the default 'page'
			// mode. Override here: this handler only runs when the drawer
			// itself is mounted, which is unambiguously the sidepane surface.
			mode: 'sidepane',
			source: 'header',
		});
		startNewConversation();
		setShowHistory(false);
	}, [startNewConversation, analyticsCtx]);

	// When user picks a conversation from the list, close the sidebar
	const handleHistorySelect = useCallback(() => {
		setShowHistory(false);
	}, []);

	if (!isOpen || isFullScreenPage) {
		return null;
	}

	const availableHeight = Math.max(
		0,
		window.innerHeight - BOTTOM_STRIP_HEIGHT - 2 * PANEL_MARGIN,
	);
	const scale = Math.max(
		1,
		Math.min(
			window.innerWidth / DESIGN_SCREEN.width,
			window.innerHeight / DESIGN_SCREEN.height,
		),
	);
	const panelWidth = Math.round(PANEL_WIDTH * scale);
	const panelHeight = Math.min(
		Math.round(PANEL_HEIGHT * scale),
		availableHeight,
	);

	return (
		<VariantContext.Provider value="panel">
			<FloatingPanel
				isOpen
				className={styles.panel}
				width={panelWidth}
				height={panelHeight}
				minWidth={PANEL_MIN_WIDTH}
				minHeight={Math.min(PANEL_MIN_HEIGHT, availableHeight)}
				enableResizing={PANEL_RESIZE_EDGES}
				keepInViewport
				avoid={PANEL_AVOID}
				defaultPosition={{
					x: window.innerWidth - panelWidth - PANEL_MARGIN,
					y: PANEL_MARGIN + availableHeight - panelHeight,
				}}
			>
				<div className={`${styles.header} floating-panel__drag-handle`}>
					<div className={`${styles.title} noz-wave`}>
						<Noz size={18} />
						{chatTitle && (
							<Typography
								variant="paragraph"
								size="base"
								weight="bold"
								color="inherit"
								as="span"
								display="block"
								textOverflow="ellipsis"
							>
								{chatTitle}
							</Typography>
						)}
					</div>

					<div className={styles.actions}>
						<Tooltip title={showHistory ? 'Back to chat' : 'Conversations'}>
							<Button
								variant="ghost"
								size="sm"
								icon
								color="secondary"
								onClick={(): void => setShowHistory((v) => !v)}
								aria-label="Toggle conversations"
							>
								<History size={14} />
							</Button>
						</Tooltip>

						<Tooltip title="New conversation">
							<Button
								variant="ghost"
								size="sm"
								icon
								color="secondary"
								onClick={handleNew}
								aria-label="New conversation"
							>
								<Plus size={14} />
							</Button>
						</Tooltip>

						<Tooltip title="Open full screen">
							<Button
								disabledTooltip="Start a conversation first"
								variant="ghost"
								size="sm"
								icon
								color="secondary"
								onClick={handleExpand}
								disabled={!activeConversationId}
								aria-label="Open full screen"
							>
								<Maximize2 size={14} />
							</Button>
						</Tooltip>

						<Tooltip title="Close">
							<Button
								variant="ghost"
								size="sm"
								icon
								color="secondary"
								testId="ai-assistant-panel-close"
								onClick={closeDrawer}
								aria-label="Close panel"
							>
								<X size={14} />
							</Button>
						</Tooltip>
					</div>
				</div>

				{showHistory ? (
					<ConversationsList onSelect={handleHistorySelect} />
				) : (
					activeConversationId && (
						<ConversationView conversationId={activeConversationId} />
					)
				)}
			</FloatingPanel>
		</VariantContext.Provider>
	);
}
