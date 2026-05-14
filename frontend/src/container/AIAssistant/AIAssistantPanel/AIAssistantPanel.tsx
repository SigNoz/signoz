import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { matchPath, useHistory, useLocation } from 'react-router-dom';
import { Button } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';
import ROUTES from 'constants/routes';
import { History, Maximize2, Plus, Sparkles, X } from '@signozhq/icons';

import ConversationsList from '../components/ConversationsList';
import ConversationView from '../ConversationView';
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

	const handleExpand = useCallback(() => {
		if (!activeConversationId) {
			return;
		}
		closeDrawer();
		history.push(
			ROUTES.AI_ASSISTANT.replace(':conversationId', activeConversationId),
		);
	}, [activeConversationId, closeDrawer, history]);

	const handleNew = useCallback(() => {
		startNewConversation();
		setShowHistory(false);
	}, [startNewConversation]);

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
					<div className={styles.title}>
						<Sparkles size={18} color="var(--primary)" />
						<span>AI Assistant</span>
					</div>

					<div className={styles.actions}>
						<Tooltip title={showHistory ? 'Back to chat' : 'Conversations'}>
							<Button
								variant="ghost"
								size="icon"
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
								size="icon"
								color="secondary"
								onClick={handleNew}
								aria-label="New conversation"
							>
								<Plus size={14} />
							</Button>
						</Tooltip>

						<Tooltip title="Open full screen">
							<Button
								variant="ghost"
								size="icon"
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
								size="icon"
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
			</div>
		</VariantContext.Provider>
	);
}
