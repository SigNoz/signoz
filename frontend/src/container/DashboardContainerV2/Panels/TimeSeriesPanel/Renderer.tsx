import { Typography } from '@signozhq/ui/typography';
import type { DashboardtypesTimeSeriesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';

import type { PanelRendererProps } from '../types';

function TimeSeriesRenderer({
	isLoading,
	error,
	data,
}: PanelRendererProps<DashboardtypesTimeSeriesPanelSpecDTO>): JSX.Element {
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
