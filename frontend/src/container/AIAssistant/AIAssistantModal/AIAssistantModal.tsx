import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHistory } from 'react-router-dom';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import ROUTES from 'constants/routes';
import { History, Maximize2, Minus, Plus, Sparkles, X } from '@signozhq/icons';

import HistorySidebar from '../components/ConversationsList';
import ConversationView from '../ConversationView';
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
	}, [isOpen, openModal, closeModal, startNewConversation]);

	// ── Handlers ────────────────────────────────────────────────────────────────

	const handleExpand = useCallback(() => {
		if (!activeConversationId) {
			return;
		}
		closeModal();
		history.push(
			ROUTES.AI_ASSISTANT.replace(':conversationId', activeConversationId),
		);
	}, [activeConversationId, closeModal, history]);

	const handleNew = useCallback(() => {
		startNewConversation();
		setShowHistory(false);
	}, [startNewConversation]);

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
				aria-label="AI Assistant"
				onClick={handleBackdropClick}
			>
				<div className={styles.modal}>
					{/* Header */}
					<div className={styles.header}>
						<div className={styles.title}>
							<Sparkles size={16} color="var(--primary)" />
							<span>AI Assistant</span>
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
									onClick={(): void => setShowHistory((v) => !v)}
									aria-label="Toggle conversations"
									className={showHistory ? styles.toggleBtnActive : ''}
								>
									<History size={14} />
								</Button>
							</TooltipSimple>

							<TooltipSimple title="New conversation">
								<Button
									variant="ghost"
									size="icon"
									onClick={handleNew}
									aria-label="New conversation"
								>
									<Plus size={14} />
								</Button>
							</TooltipSimple>

							<TooltipSimple title="Open full screen">
								<Button
									variant="ghost"
									size="icon"
									onClick={handleExpand}
									disabled={!activeConversationId}
									aria-label="Open full screen"
								>
									<Maximize2 size={14} />
								</Button>
							</TooltipSimple>

							<TooltipSimple title="Minimize to side panel">
								<Button
									variant="ghost"
									size="icon"
									onClick={handleMinimize}
									aria-label="Minimize to side panel"
								>
									<Minus size={14} />
								</Button>
							</TooltipSimple>

							<TooltipSimple title="Close">
								<Button
									variant="ghost"
									size="icon"
									onClick={closeModal}
									aria-label="Close"
								>
									<X size={14} />
								</Button>
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
