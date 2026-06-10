import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import logEvent from 'api/common/logEvent';
import Noz from 'components/Noz/Noz';
import { NOZ_TOOLTIP_TITLE } from 'components/Noz/Noz.constants';
import {
	AIAssistantEvents,
	AIAssistantOpenSource,
} from 'container/AIAssistant/events';
import { normalizePage } from 'container/AIAssistant/hooks/useAIAssistantAnalyticsContext';
import { openAIAssistant } from 'container/AIAssistant/store/useAIAssistantStore';
import { useIsAIAssistantEnabled } from 'hooks/useIsAIAssistantEnabled';

export default function NozButton(): JSX.Element | null {
	const { pathname } = useLocation();
	const isAIAssistantEnabled = useIsAIAssistantEnabled();

	const handleOpenNoz = useCallback((): void => {
		void logEvent(AIAssistantEvents.Opened, {
			source: AIAssistantOpenSource.TraceDetails,
			currentPage: normalizePage(pathname),
		});
		openAIAssistant();
	}, [pathname]);

	if (!isAIAssistantEnabled) {
		return null;
	}

	return (
		<TooltipSimple title={NOZ_TOOLTIP_TITLE}>
			<Button
				variant="ghost"
				size="icon"
				color="secondary"
				className="noz-wave"
				aria-label="Open Noz"
				onClick={handleOpenNoz}
			>
				<Noz size={16} />
			</Button>
		</TooltipSimple>
	);
}
