import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHistory, useLocation } from 'react-router-dom';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import ROUTES from 'constants/routes';
import { History, Maximize2, Minus, Plus, X } from '@signozhq/icons';
import Noz from 'components/Noz/Noz';

import logEvent from 'api/common/logEvent';

import HistorySidebar from '../components/ConversationsList';
import ConversationView from '../ConversationView';
import { AIAssistantEvents, AIAssistantOpenSource } from '../events';
import {
	normalizePage,
	useAIAssistantAnalyticsContext,
} from '../hooks/useAIAssistantAnalyticsContext';
import { useAIAssistantStore } from '../store/useAIAssistantStore';
import { VariantContext } from '../VariantContext';

import styles from './AIAssistantModal.module.scss';

/**
 * Global floating modal for the AI Assistant.
 *
 * - Triggered by Cmd+J (Mac) / Ctrl+J (Windows/Linux)
 * - Escape or the × button fully closes it
 * - The − (minimize) button collapses to the side panel
 * - Mounted once in AppLayout; always in the DOM, conditionally visible
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export default function AIAssistantModal(): JSX.Element | null {
	const history = useHistory();
	const { pathname } = useLocation();
	const [showHistory, setShowHistory] = useState(false);

	const isOpen = useAIAssistantStore((s) => s.isModalOpen);
	const activeConversationId = useAIAssistantStore(
		(s) => s.activeConversationId,
	);
	const openModal = useAIAssistantStore((s) => s.openModal);
	const closeModal = useAIAssistantStore((s) => s.closeModal);
	const minimizeModal = useAIAssistantStore((s) => s.minimizeModal);
	const startNewConversation = useAIAssistantStore(
		(s) => s.startNewConversation,
	);
	const analyticsCtx = useAIAssistantAnalyticsContext();

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent): void => {
			// Cmd+J (Mac) / Ctrl+J (Win/Linux) — toggle modal. Opening
			// always starts a brand-new conversation; resuming earlier
			// threads is done via the in-modal history sidebar.
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
				// Don't intercept Cmd+J inside input/textarea — those are for the user
				const tag = (e.target as HTMLElement).tagName;
				if (tag === 'INPUT' || tag === 'TEXTAREA') {
					return;
				}

				e.preventDefault();
				if (isOpen) {
					closeModal();
				} else {
					startNewConversation();
					setShowHistory(false);
					void logEvent(AIAssistantEvents.Opened, {
						source: AIAssistantOpenSource.Shortcut,
						currentPage: normalizePage(pathname),
					});
					openModal();
				}
				return;
			}

			// Escape — close modal
			if (e.key === 'Escape' && isOpen) {
				closeModal();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return (): void => window.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, openModal, closeModal, startNewConversation, pathname]);

	// ── Handlers ────────────────────────────────────────────────────────────────

	const handleExpand = useCallback(() => {
		if (!activeConversationId) {
			return;
		}
		closeModal();
		// Router state tells AIAssistantPage to skip its mount-time Opened fire:
		// the assistant was already open in the modal, so this is a surface
		// switch, not a new open.
		history.push(
			ROUTES.AI_ASSISTANT.replace(':conversationId', activeConversationId),
			{ fromInApp: true },
		);
	}, [activeConversationId, closeModal, history]);

	const handleNew = useCallback(() => {
		void logEvent(AIAssistantEvents.NewChatClicked, {
			...analyticsCtx,
			// useAIAssistantAnalyticsContext() runs above this component's
			// VariantContext.Provider, so the hook reports the default 'page'
			// mode. Override here: the modal collapses to 'sidepane' in our
			// taxonomy alongside the drawer.
			mode: 'sidepane',
			source: 'header',
		});
		startNewConversation();
		setShowHistory(false);
	}, [startNewConversation, analyticsCtx]);

	const handleHistorySelect = useCallback(() => {
		setShowHistory(false);
	}, []);

	const handleMinimize = useCallback(() => {
		minimizeModal();
		setShowHistory(false);
	}, [minimizeModal]);

	const handleBackdropClick = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			// Only close when clicking the backdrop itself, not the modal card
			if (e.target === e.currentTarget) {
				closeModal();
			}
		},
		[closeModal],
	);

	if (!isOpen) {
		return null;
	}

	return createPortal(
		<VariantContext.Provider value="modal">
			<div
				className={styles.backdrop}
				role="dialog"
				aria-modal="true"
				aria-label="Noz"
				onClick={handleBackdropClick}
			>
				<div className={styles.modal}>
					{/* Header */}
					<div className={styles.header}>
						<div className={`${styles.title} noz-wave`}>
							<Noz size={16} />
							<span>Noz</span>
							<kbd className={styles.shortcut}>
								<span>⌘</span>
								<span>J</span>
							</kbd>
						</div>

						<div className={styles.actions}>
							<TooltipSimple title={showHistory ? 'Back to chat' : 'Conversations'}>
								<Button
									variant="ghost"
									size="icon"
									color="secondary"
									onClick={(): void => setShowHistory((v) => !v)}
									aria-label="Toggle conversations"
									className={showHistory ? styles.toggleBtnActive : ''}
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

							<TooltipSimple title="Minimize to side panel">
								<Button
									variant="ghost"
									size="icon"
									color="secondary"
									onClick={handleMinimize}
									aria-label="Minimize to side panel"
									prefix={<Minus size={14} />}
								/>
							</TooltipSimple>

							<TooltipSimple title="Close">
								<Button
									variant="ghost"
									size="icon"
									color="secondary"
									onClick={closeModal}
									aria-label="Close"
									prefix={<X size={14} />}
								/>
							</TooltipSimple>
						</div>
					</div>

					{/* Body */}
					<div className={styles.body}>
						{showHistory ? (
							<HistorySidebar onSelect={handleHistorySelect} />
						) : (
							activeConversationId && (
								<ConversationView conversationId={activeConversationId} />
							)
						)}
					</div>
				</div>
			</div>
		</VariantContext.Provider>,
		document.body,
	);
}
