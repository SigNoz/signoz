import { useCallback, useLayoutEffect, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { matchRoute } from 'lib/router/matchRoute';
import { navigate } from 'lib/router/navigation';
import { useAppLocation } from 'lib/router/useAppLocation';
import { Tooltip } from '@signozhq/ui/tooltip';
import ROUTES from 'constants/routes';
import { History, Maximize2, Minus, Plus, X } from '@signozhq/icons';
import Noz from 'components/Noz/Noz';
import { BOTTOM_STRIP_HEIGHT } from 'container/BottomStrip';
import { FloatingPanel } from 'periscope/components/FloatingPanel';

import logEvent from 'api/common/logEvent';

import ConversationsList from '../components/ConversationsList';
import ConversationView from '../ConversationView';
import { AIAssistantEvents } from '../events';
import { useAIAssistantAnalyticsContext } from '../hooks/useAIAssistantAnalyticsContext';
import { useAIAssistantStore } from '../store/useAIAssistantStore';
import { VariantContext } from '../VariantContext';

import styles from './AIAssistantPanel.module.scss';

const AI_ASSISTANT_PANEL_OPEN_CLASS = 'ai-assistant-panel-open';
const AI_ASSISTANT_PANEL_WIDTH_VAR = '--ai-assistant-panel-width';

const PANEL_WIDTH = 420;
const PANEL_HEIGHT = 601;
const PANEL_MIN_WIDTH = 380;
const PANEL_MIN_HEIGHT = 500;
const PANEL_MARGIN = 8;
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

export default function AIAssistantPanel(): JSX.Element | null {
	const { pathname } = useAppLocation();
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

	const handleExpand = useCallback(() => {
		if (!activeConversationId) {
			return;
		}
		closeDrawer();
		// Router state tells AIAssistantPage to skip its mount-time Opened fire:
		// the assistant was already open in the drawer, so this is a surface
		// switch, not a new open.
		navigate(
			ROUTES.AI_ASSISTANT.replace(':conversationId', activeConversationId),
			{ state: { fromInApp: true } },
		);
	}, [activeConversationId, closeDrawer]);

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

	useLayoutEffect(() => {
		const shouldOffsetChatSupport = isOpen && !isFullScreenPage;

		document.body.classList.toggle(
			AI_ASSISTANT_PANEL_OPEN_CLASS,
			shouldOffsetChatSupport,
		);

		if (shouldOffsetChatSupport) {
			document.body.style.setProperty(
				AI_ASSISTANT_PANEL_WIDTH_VAR,
				`${PANEL_WIDTH}px`,
			);
		} else {
			document.body.style.removeProperty(AI_ASSISTANT_PANEL_WIDTH_VAR);
		}

		return (): void => {
			document.body.classList.remove(AI_ASSISTANT_PANEL_OPEN_CLASS);
			document.body.style.removeProperty(AI_ASSISTANT_PANEL_WIDTH_VAR);
		};
	}, [isFullScreenPage, isOpen]);

	if (!isOpen || isFullScreenPage) {
		return null;
	}

	const panelHeight = Math.max(
		PANEL_MIN_HEIGHT,
		Math.min(
			PANEL_HEIGHT,
			window.innerHeight - BOTTOM_STRIP_HEIGHT - 2 * PANEL_MARGIN,
		),
	);

	return (
		<VariantContext.Provider value="panel">
			<FloatingPanel
				isOpen
				className={styles.panel}
				width={PANEL_WIDTH}
				height={panelHeight}
				minWidth={PANEL_MIN_WIDTH}
				minHeight={PANEL_MIN_HEIGHT}
				enableResizing={PANEL_RESIZE_EDGES}
				defaultPosition={{
					x: window.innerWidth - PANEL_WIDTH - PANEL_MARGIN,
					// Never above the viewport, where the header could not be dragged back.
					y: Math.max(
						0,
						window.innerHeight - BOTTOM_STRIP_HEIGHT - PANEL_MARGIN - panelHeight,
					),
				}}
			>
				<div className={`${styles.header} floating-panel__drag-handle`}>
					<div className={`${styles.title} noz-wave`}>
						<Noz size={18} />
						<span>Noz</span>
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

						<Tooltip title="Minimize">
							<Button
								variant="ghost"
								size="sm"
								icon
								color="secondary"
								onClick={closeDrawer}
								aria-label="Minimize panel"
							>
								<Minus size={14} />
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
