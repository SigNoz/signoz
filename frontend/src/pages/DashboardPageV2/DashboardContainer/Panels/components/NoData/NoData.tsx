import { CalendarRange, Clock, RotateCw } from '@signozhq/icons';
import logEvent from 'api/common/logEvent';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';

import { panelHasFixedTimePreference } from '../../../hooks/resolvePanelTimeWindow';
import {
	selectViewPanelExtendWindow,
	useViewPanelStore,
} from '../../../store/useViewPanelStore';
import { PANEL_KIND_TO_PANEL_TYPE } from '../../types/panelKind';
import PanelLoader from '../PanelLoader/PanelLoader';
import PanelMessage, { PanelMessageAction } from '../PanelMessage/PanelMessage';
import { useExtendTimeWindow } from './useExtendTimeWindow';

interface NoDataProps {
	title?: string;
	description?: string;
	/** In flight over empty data → show the loader, not the empty state. */
	isFetching?: boolean;
	/** When provided, renders a Retry button that re-runs the query. */
	onRetry?: () => void;
	/** Hides the global "Extend time range" action when this panel is locked to a fixed time preference. */
	panel?: DashboardtypesPanelDTO;
	'data-testid'?: string;
}

/**
 * Shared empty-state for panel renderers. The query succeeded but returned nothing,
 * so we offer to widen the time window — global by default, or the View modal's
 * local window when it publishes one to the store — alongside a Retry that re-runs
 * the query.
 */
function NoData({
	title = 'No data in this time range',
	description = 'Nothing in the selected window. Try widening the range.',
	isFetching = false,
	onRetry,
	panel,
	'data-testid': testId = 'panel-no-data',
}: NoDataProps): JSX.Element {
	const viewExtend = useViewPanelStore(selectViewPanelExtendWindow);
	const globalExtend = useExtendTimeWindow();
	// The View modal's local extender wins; the global one only applies to a panel that
	// follows the ambient window (a fixed preference can't be widened by it).
	const hasFixedTimePreference = panel
		? panelHasFixedTimePreference(panel)
		: false;
	const activeExtend =
		viewExtend ?? (hasFixedTimePreference ? undefined : globalExtend);

	if (isFetching) {
		return <PanelLoader />;
	}

	const panelType = panel
		? PANEL_KIND_TO_PANEL_TYPE[panel.spec.plugin.kind]
		: undefined;

	const extendAction: PanelMessageAction | undefined =
		activeExtend?.canExtend && activeExtend.actionLabel
			? {
					label: activeExtend.actionLabel,
					onClick: (): void => {
						void logEvent(DashboardDetailEvents.NoDataAction, {
							action: 'extendTime',
							panelType,
						});
						activeExtend.extend();
					},
					icon: <CalendarRange size={14} />,
				}
			: undefined;

	const retryAction: PanelMessageAction | undefined = onRetry
		? {
				label: 'Retry',
				onClick: (): void => {
					void logEvent(DashboardDetailEvents.NoDataAction, {
						action: 'retry',
						panelType,
					});
					onRetry();
				},
				icon: <RotateCw size={14} />,
			}
		: undefined;

	return (
		<PanelMessage
			icon={<Clock size={18} />}
			title={title}
			description={description}
			action={extendAction ?? retryAction}
			secondaryAction={extendAction ? retryAction : undefined}
			data-testid={testId}
		/>
	);
}

export default NoData;
