import { useLocation } from 'react-router-dom';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import Noz from 'components/Noz/Noz';
import { NOZ_TOOLTIP_TITLE } from 'components/Noz/Noz.constants';
import { selectPendingUserInputStreamCount } from 'container/AIAssistant/store/pendingInputSelectors';
import {
	openAIAssistant,
	useAIAssistantStore,
} from 'container/AIAssistant/store/useAIAssistantStore';
import { useIsAIAssistantEnabled } from 'hooks/useIsAIAssistantEnabled';
import ROUTES from 'constants/routes';
import { Dot } from '@signozhq/icons';

import styles from './AskNoz.module.scss';

/**
 * Opens the Noz drawer, matching the header entry it replaces. Cmd+K opens the
 * modal instead; this is deliberately the drawer.
 *
 * Carries the header's pending badge: when Noz is blocked on the user
 * (`awaiting_approval` / `awaiting_clarification`) a dot pulses. Without it,
 * hiding the header button would remove a notification rather than move it.
 */
function AskNoz(): JSX.Element | null {
	const { pathname } = useLocation();
	const isAIAssistantEnabled = useIsAIAssistantEnabled();
	const isDrawerOpen = useAIAssistantStore((state) => state.isDrawerOpen);
	const isModalOpen = useAIAssistantStore((state) => state.isModalOpen);
	const pendingUserInputCount = useAIAssistantStore(
		selectPendingUserInputStreamCount,
	);

	// Noz is already on screen in the modal, so the "needs you" dot would be noise.
	const showPendingBadge = pendingUserInputCount > 0 && !isModalOpen;

	// The drawer does not render on the Noz full page, so the button would be inert.
	const isAIAssistantPage = pathname.startsWith(ROUTES.AI_ASSISTANT_BASE);

	if (!isAIAssistantEnabled || isDrawerOpen || isAIAssistantPage) {
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
			<TooltipSimple title={NOZ_TOOLTIP_TITLE}>
				<Button
					variant="ghost"
					color="secondary"
					size="sm"
					className="noz-wave"
					prefix={<Noz size={16} />}
					onClick={(): void => openAIAssistant()}
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
			</TooltipSimple>
		</div>
	);
}

export default AskNoz;
