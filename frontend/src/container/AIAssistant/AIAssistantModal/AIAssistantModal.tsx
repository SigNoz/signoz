import { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { navigate } from 'lib/router/navigation';
import { useAppLocation } from 'lib/router/useAppLocation';
import { Tooltip } from '@signozhq/ui/tooltip';
import ROUTES from 'constants/routes';
import { Maximize2, Minus, X } from '@signozhq/icons';

import logEvent from 'api/common/logEvent';

import ConversationView from '../ConversationView';
import { AIAssistantEvents, AIAssistantOpenSource } from '../events';
import { normalizePage } from '../hooks/useAIAssistantAnalyticsContext';
import { useActiveChatTitle } from '../hooks/useActiveChatTitle';
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
	const { pathname, search } = useAppLocation();

	const isOpen = useAIAssistantStore((s) => s.isModalOpen);
	const activeConversationId = useAIAssistantStore(
		(s) => s.activeConversationId,
	);
	const chatTitle = useActiveChatTitle();
	const openModal = useAIAssistantStore((s) => s.openModal);
	const closeModal = useAIAssistantStore((s) => s.closeModal);
	const minimizeModal = useAIAssistantStore((s) => s.minimizeModal);
	const startNewConversation = useAIAssistantStore(
		(s) => s.startNewConversation,
	);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent): void => {
			// Cmd+J (Mac) / Ctrl+J (Win/Linux) — toggle modal. Opening
			// always starts a brand-new conversation.
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
		// switch, not a new open. `returnTo` is where its minimize button comes back to.
		navigate(
			ROUTES.AI_ASSISTANT.replace(':conversationId', activeConversationId),
			{ state: { fromInApp: true, returnTo: `${pathname}${search}` } },
		);
	}, [activeConversationId, closeModal, pathname, search]);

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
				data-testid="ai-assistant-modal"
				aria-modal="true"
				aria-label="Noz"
				onClick={handleBackdropClick}
			>
				<div className={styles.modal}>
					{/* Header */}
					<div className={styles.header}>
						<div className={styles.title}>
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
							<kbd className={styles.shortcut}>
								<span>⌘</span>
								<span>J</span>
							</kbd>
						</div>

						<div className={styles.actions}>
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

							<Tooltip title="Minimize to side panel">
								<Button
									variant="ghost"
									size="sm"
									icon
									color="secondary"
									onClick={minimizeModal}
									aria-label="Minimize to side panel"
								>
									<Minus size={14} />
								</Button>
							</Tooltip>

							<Tooltip title="Close">
								<Button
									variant="ghost"
									size="sm"
									icon
									color="secondary"
									onClick={closeModal}
									aria-label="Close"
								>
									<X size={14} />
								</Button>
							</Tooltip>
						</div>
					</div>

					{/* Body */}
					<div className={styles.body}>
						{activeConversationId && (
							<ConversationView conversationId={activeConversationId} />
						)}
					</div>
				</div>
			</div>
		</VariantContext.Provider>,
		document.body,
	);
}
