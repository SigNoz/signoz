import { useCallback } from 'react';
import { Button } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';
import logEvent from 'api/common/logEvent';
import Noz from 'components/Noz/Noz';
import { NOZ_TOOLTIP_TITLE } from 'components/Noz/Noz.constants';
import {
	AIAssistantEvents,
	AIAssistantOpenSource,
} from 'container/AIAssistant/events';
import {
	normalizePage,
	useAIAssistantAnalyticsContext,
} from 'container/AIAssistant/hooks/useAIAssistantAnalyticsContext';
import { selectPendingUserInputStreamCount } from 'container/AIAssistant/store/pendingInputSelectors';
import {
	openNewAIAssistantChat,
	useAIAssistantStore,
} from 'container/AIAssistant/store/useAIAssistantStore';
import { useIsAIAssistantEnabled } from 'hooks/useIsAIAssistantEnabled';
import { useAppLocation } from 'lib/router/useAppLocation';
import ROUTES from 'constants/routes';
import { Dot } from '@signozhq/icons';

import styles from './AskNoz.module.scss';

/**
 * Opens the Noz drawer on a new chat, matching the header entry it replaces.
 * Cmd+K opens the modal instead; this is deliberately the drawer. It stays while
 * the drawer is open, where it is the way to start another chat.
 *
 * Carries the header's pending badge: when Noz is blocked on the user
 * (`awaiting_approval` / `awaiting_clarification`) a dot pulses. Without it,
 * hiding the header button would remove a notification rather than move it.
 */
function AskNoz(): JSX.Element | null {
	const { pathname } = useAppLocation();
	const isAIAssistantEnabled = useIsAIAssistantEnabled();
	const isDrawerOpen = useAIAssistantStore((state) => state.isDrawerOpen);
	const isModalOpen = useAIAssistantStore((state) => state.isModalOpen);
	const pendingUserInputCount = useAIAssistantStore(
		selectPendingUserInputStreamCount,
	);

	// Noz is already on screen in the drawer or modal, so the "needs you" dot would be noise.
	const showPendingBadge =
		pendingUserInputCount > 0 && !isDrawerOpen && !isModalOpen;

	// The drawer does not render on the Noz full page, so the button would be inert.
	const isAIAssistantPage = pathname.startsWith(ROUTES.AI_ASSISTANT_BASE);

	const analyticsCtx = useAIAssistantAnalyticsContext();

	const handleOpen = useCallback((): void => {
		if (isDrawerOpen) {
			void logEvent(AIAssistantEvents.NewChatClicked, {
				...analyticsCtx,
				// Outside the panel's VariantContext the hook reports 'page'; the chat opens in the drawer.
				mode: 'sidepane',
				source: AIAssistantOpenSource.BottomStrip,
			});
		} else {
			void logEvent(AIAssistantEvents.Opened, {
				source: AIAssistantOpenSource.BottomStrip,
				currentPage: normalizePage(pathname),
			});
		}
		openNewAIAssistantChat();
	}, [analyticsCtx, isDrawerOpen, pathname]);

	if (!isAIAssistantEnabled || isAIAssistantPage) {
		return null;
	}

	return (
		<div className={styles.askNoz} data-testid="bottom-strip-ask-noz">
			{showPendingBadge && (
				<span className={styles.badge} aria-hidden>
					<span className={styles.pulseDot}>
						<Dot size={36} />
					</span>
				</span>
			)}
			<span className="noz-wave">
				<Tooltip title={NOZ_TOOLTIP_TITLE}>
					<Button
						variant="ghost"
						color="secondary"
						size="sm"
						prefix={<Noz size={16} />}
						testId="bottom-strip-ask-noz-button"
						onClick={handleOpen}
						aria-label={
							showPendingBadge
								? `Ask Noz, ${pendingUserInputCount} ${
										pendingUserInputCount === 1 ? 'action needs' : 'actions need'
									} your response`
								: 'Ask Noz'
						}
					>
						Ask Noz
					</Button>
				</Tooltip>
			</span>
		</div>
	);
}

export default AskNoz;
