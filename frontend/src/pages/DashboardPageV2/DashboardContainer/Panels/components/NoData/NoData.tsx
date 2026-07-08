import { CalendarRange, Clock, RotateCw } from '@signozhq/icons';

import {
	selectViewPanelExtendWindow,
	useViewPanelStore,
} from '../../../store/useViewPanelStore';
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
	'data-testid': testId = 'panel-no-data',
}: NoDataProps): JSX.Element {
	const viewExtend = useViewPanelStore(selectViewPanelExtendWindow);
	const globalExtend = useExtendTimeWindow();
	const { canExtend, actionLabel, extend } = viewExtend ?? globalExtend;

	if (isFetching) {
		return <PanelLoader />;
	}

	const extendAction: PanelMessageAction | undefined =
		canExtend && actionLabel
			? { label: actionLabel, onClick: extend, icon: <CalendarRange size={14} /> }
			: undefined;

	const retryAction: PanelMessageAction | undefined = onRetry
		? { label: 'Retry', onClick: onRetry, icon: <RotateCw size={14} /> }
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
