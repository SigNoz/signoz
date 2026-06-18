import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { matchPath, useHistory, useLocation } from 'react-router-dom';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import ROUTES from 'constants/routes';
import { History, Maximize2, Plus, X } from '@signozhq/icons';
import Noz from 'components/Noz/Noz';

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

export default function AIAssistantPanel(): JSX.Element | null {
	const history = useHistory();
	const { pathname } = useLocation();
	const [showHistory, setShowHistory] = useState(false);

	const isOpen = useAIAssistantStore((s) => s.isDrawerOpen);
	const isFullScreenPage = !!matchPath(pathname, {
		path: ROUTES.AI_ASSISTANT,
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
		history.push(
			ROUTES.AI_ASSISTANT.replace(':conversationId', activeConversationId),
			{ fromInApp: true },
		);
	}, [activeConversationId, closeDrawer, history]);

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

	// ── Resize logic ──────────────────────────────────────────────────────────
	const [panelWidth, setPanelWidth] = useState(380);
	const dragStartX = useRef(0);
	const dragStartWidth = useRef(0);

	useLayoutEffect(() => {
		const shouldOffsetChatSupport = isOpen && !isFullScreenPage;

		document.body.classList.toggle(
			AI_ASSISTANT_PANEL_OPEN_CLASS,
			shouldOffsetChatSupport,
		);

		if (shouldOffsetChatSupport) {
			document.body.style.setProperty(
				AI_ASSISTANT_PANEL_WIDTH_VAR,
				`${panelWidth}px`,
			);
		} else {
			document.body.style.removeProperty(AI_ASSISTANT_PANEL_WIDTH_VAR);
		}

		return (): void => {
			document.body.classList.remove(AI_ASSISTANT_PANEL_OPEN_CLASS);
			document.body.style.removeProperty(AI_ASSISTANT_PANEL_WIDTH_VAR);
		};
	}, [isFullScreenPage, isOpen, panelWidth]);

	const handleResizeMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			dragStartX.current = e.clientX;
			dragStartWidth.current = panelWidth;

			const onMouseMove = (ev: MouseEvent): void => {
				// Panel is on the right; dragging left (lower clientX) increases width
				const delta = dragStartX.current - ev.clientX;
				const next = Math.min(Math.max(dragStartWidth.current + delta, 380), 800);
				setPanelWidth(next);
			};

			const onMouseUp = (): void => {
				document.removeEventListener('mousemove', onMouseMove);
				document.removeEventListener('mouseup', onMouseUp);
				document.body.style.cursor = '';
				document.body.style.userSelect = '';
			};

			document.body.style.cursor = 'col-resize';
			document.body.style.userSelect = 'none';
			document.addEventListener('mousemove', onMouseMove);
			document.addEventListener('mouseup', onMouseUp);
		},
		[panelWidth],
	);

	if (!isOpen || isFullScreenPage) {
		return null;
	}

	return (
		<VariantContext.Provider value="panel">
			<div className={styles.panel} style={{ width: panelWidth }}>
				{/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
				<div className={styles.resizeHandle} onMouseDown={handleResizeMouseDown} />
				<div className={styles.header}>
					<div className={`${styles.title} noz-wave`}>
						<Noz size={18} />
						<span>Noz</span>
					</div>

					<div className={styles.actions}>
						<TooltipSimple title={showHistory ? 'Back to chat' : 'Conversations'}>
							<Button
								variant="ghost"
								size="icon"
								color="secondary"
								onClick={(): void => setShowHistory((v) => !v)}
								aria-label="Toggle conversations"
								prefix={<History size={14} />}
							/>
						</TooltipSimple>

						<TooltipSimple title="New conversation">
							<Button
								variant="ghost"
								size="icon"
								color="secondary"
								onClick={handleNew}
								aria-label="New conversation"
								prefix={<Plus size={14} />}
							/>
						</TooltipSimple>

						<TooltipSimple title="Open full screen">
							<Button
								variant="ghost"
								size="icon"
								color="secondary"
								onClick={handleExpand}
								disabled={!activeConversationId}
								aria-label="Open full screen"
								prefix={<Maximize2 size={14} />}
							/>
						</TooltipSimple>

						<TooltipSimple title="Close">
							<Button
								variant="ghost"
								size="icon"
								color="secondary"
								onClick={closeDrawer}
								aria-label="Close panel"
								prefix={<X size={14} />}
							/>
						</TooltipSimple>
					</div>
				</div>

				{showHistory ? (
					<ConversationsList onSelect={handleHistorySelect} />
				) : (
					activeConversationId && (
						<ConversationView conversationId={activeConversationId} />
					)
				)}
			</div>
		</VariantContext.Provider>
	);
}
