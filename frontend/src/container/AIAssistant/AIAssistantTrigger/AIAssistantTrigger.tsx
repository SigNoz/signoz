import { useCallback } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import Noz from 'components/Noz/Noz';

import { AIAssistantEvents, AIAssistantOpenSource } from '../events';
import { normalizePage } from '../hooks/useAIAssistantAnalyticsContext';
import {
	openAIAssistant,
	useAIAssistantStore,
} from '../store/useAIAssistantStore';

import styles from './AIAssistantTrigger.module.scss';

/**
 * Floating action button anchored to the bottom-right of the content area.
 * Hidden when the panel is already open or when on the full-screen AI Assistant page.
 */
export default function AIAssistantTrigger(): JSX.Element | null {
	const { pathname } = useLocation();
	const isDrawerOpen = useAIAssistantStore((s) => s.isDrawerOpen);
	const isModalOpen = useAIAssistantStore((s) => s.isModalOpen);

	const isFullScreenPage = !!matchPath(pathname, {
		path: ROUTES.AI_ASSISTANT,
		exact: true,
	});

	const handleOpen = useCallback((): void => {
		void logEvent(AIAssistantEvents.Opened, {
			source: AIAssistantOpenSource.Icon,
			currentPage: normalizePage(pathname),
		});
		openAIAssistant();
	}, [pathname]);

	if (isDrawerOpen || isModalOpen || isFullScreenPage) {
		return null;
	}

	return (
		<TooltipSimple title="Noz">
			<Button
				variant="solid"
				color="primary"
				className={`${styles.trigger} noz-wave`}
				onClick={handleOpen}
				aria-label="Open Noz"
			>
				<Noz size={24} />
			</Button>
		</TooltipSimple>
	);
}
