import { CalendarRange, Clock, RotateCw } from '@signozhq/icons';
import logEvent from 'api/common/logEvent';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { DashboardDetailEvents } from 'pages/DashboardPage/constants/events';

import { panelHasFixedTimePreference } from '../../../hooks/resolvePanelTimeWindow';
import {
	selectViewPanelExtendWindow,
	useViewPanelStore,
} from '../../../store/useViewPanelStore';
import { toLegacyPanelType } from '../../types/panelKind';
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
	/**
	 * The panel this empty state stands in for. Every renderer has it, and it decides
	 * whether the global "Extend time range" action applies (a panel locked to a fixed
	 * time preference can't be widened by it) as well as what the action events report.
	 */
	panel: DashboardtypesPanelDTO;
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
	const activeExtend =
		viewExtend ?? (panelHasFixedTimePreference(panel) ? undefined : globalExtend);

	if (isFetching) {
		return <PanelLoader />;
	}

	// `panelType` stays on the event so existing reports keep resolving; `panelKind` is the
	// V2 identity, and the only one that can tell two kinds sharing a panel type apart.
	const panelKind = panel.spec.plugin.kind;
	const panelType = toLegacyPanelType(panelKind);

	const extendAction: PanelMessageAction | undefined =
		activeExtend?.canExtend && activeExtend.actionLabel
			? {
					label: activeExtend.actionLabel,
					onClick: (): void => {
						void logEvent(DashboardDetailEvents.NoDataAction, {
							action: 'extendTime',
							panelType,
							panelKind,
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
						panelKind,
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
