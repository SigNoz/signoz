import { Clock, RotateCw } from '@signozhq/icons';

import PanelMessage from '../PanelMessage/PanelMessage';

interface NoDataProps {
	/** Title override. Defaults to the time-range empty-state copy. */
	title?: string;
	/** Description override. Defaults to the "widen the range" hint. */
	description?: string;
	/** When provided, renders a Retry button that re-runs the query. */
	onRetry?: () => void;
	'data-testid'?: string;
}

/**
 * Shared empty-state for panel renderers: wraps `PanelMessage` so every panel
 * kind surfaces the same "no data" affordance when a query returns nothing.
 */
function NoData({
	title = 'No data in this time range',
	description = 'Nothing in the selected window. Try widening the range.',
	onRetry,
	'data-testid': testId = 'panel-no-data',
}: NoDataProps): JSX.Element {
	return (
		<PanelMessage
			icon={<Clock size={18} />}
			title={title}
			description={description}
			action={
				onRetry
					? { label: 'Retry', onClick: onRetry, icon: <RotateCw size={14} /> }
					: undefined
			}
			data-testid={testId}
		/>
	);
}

export default NoData;
