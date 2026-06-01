import { Typography } from '@signozhq/ui/typography';

import type { PanelRendererProps } from '../types';

/** Skeleton Component for TimeSeriesPanel
 * TODO: will be replaced by actual implementation in subsequent PRs. This is to unblock the integration of the panel into the dashboard and work on other dependent features.
 */

function TimeSeriesRenderer({
	isLoading,
	error,
	data,
}: PanelRendererProps): JSX.Element {
	let status = 'idle';
	if (isLoading) {
		status = 'loading';
	} else if (error) {
		status = `error: ${error.message}`;
	} else if (data) {
		status = 'data available';
	}

	return (
		<div
			data-testid="time-series-renderer-stub"
			style={{
				display: 'flex',
				flex: 1,
				alignItems: 'center',
				justifyContent: 'center',
				padding: 12,
				color: 'var(--bg-vanilla-400, #8993ae)',
				fontSize: 12,
				textAlign: 'center',
			}}
		>
			<div>
				<Typography.Text>TimeSeries renderer (stub)</Typography.Text>
				<div style={{ marginTop: 6 }}>{status}</div>
			</div>
		</div>
	);
}

export default TimeSeriesRenderer;
