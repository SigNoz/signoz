import { useCallback } from 'react';
import ChartWrapper from 'container/DashboardContainer/visualization/charts/ChartWrapper/ChartWrapper';
import Tooltip from 'lib/uPlotV2/components/Tooltip/Tooltip';
import { TooltipRenderArgs } from 'lib/uPlotV2/components/types';
import _noop from 'lodash-es/noop';

import { TimeSeriesChartProps } from '../types';

export default function TimeSeries(props: TimeSeriesChartProps): JSX.Element {
	const { children, ...rest } = props;

	const renderTooltip = useCallback(
		(props: TooltipRenderArgs): React.ReactNode => {
			return (
				<Tooltip
					{...props}
					timezone={rest.timezone}
					yAxisUnit={rest.yAxisUnit}
					decimalPrecision={rest.decimalPrecision}
				/>
			);
		},
		[rest.timezone, rest.yAxisUnit, rest.decimalPrecision],
	);

	return (
		<ChartWrapper {...rest} renderTooltip={renderTooltip}>
			{children}
		</ChartWrapper>
	);
}
