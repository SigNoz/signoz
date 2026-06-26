import { Color } from '@signozhq/design-tokens';
import { Typography } from '@signozhq/ui/typography';
import { useGetMetricReductionRuleTimeseries } from 'api/generated/services/metrics';
import { PANEL_TYPES } from 'constants/queryBuilder';
import BarChart from 'container/DashboardContainer/visualization/charts/BarChart/BarChart';
import { buildBaseConfig } from 'container/DashboardContainer/visualization/panels/utils/baseConfigBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import { DrawStyle } from 'lib/uPlotV2/config/types';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { useTimezone } from 'providers/Timezone';
import { useMemo, useRef } from 'react';

import { buildVolumeChartPayload } from '../../chartUtils';
import styles from './VolumeControlChart.module.scss';

const COLOR_MAPPING: Record<string, string> = {
	Ingested: Color.BG_ROBIN_500,
	Retained: Color.BG_FOREST_500,
};

interface VolumeControlChartProps {
	enabled: boolean;
}

function VolumeControlChart({ enabled }: VolumeControlChartProps): JSX.Element {
	const { data } = useGetMetricReductionRuleTimeseries({ query: { enabled } });

	const isDarkMode = useIsDarkMode();
	const { timezone } = useTimezone();
	const graphRef = useRef<HTMLDivElement>(null);
	const dimensions = useResizeObserver(graphRef);

	const payload = useMemo(
		() => buildVolumeChartPayload(data?.data).payload,
		[data],
	);
	const chartData = useMemo(() => getUPlotChartData(payload), [payload]);

	const config = useMemo(() => {
		const timestamps = (chartData[0] as number[]) ?? [];
		const builder = buildBaseConfig({
			id: 'metric-volume-control',
			isDarkMode,
			apiResponse: payload,
			timezone,
			panelType: PANEL_TYPES.BAR,
			yAxisUnit: 'short',
			onDragSelect: (): void => {},
			minTimeScale: timestamps[0],
			maxTimeScale: timestamps[timestamps.length - 1],
		});
		(payload.data.result ?? []).forEach((series) => {
			builder.addSeries({
				scaleKey: 'y',
				drawStyle: DrawStyle.Bar,
				label: series.legend ?? series.queryName,
				colorMapping: COLOR_MAPPING,
				isDarkMode,
			});
		});
		return builder;
	}, [payload, chartData, isDarkMode, timezone]);

	return (
		<div className={styles.chart} data-testid="volume-control-chart">
			<Typography.Text className={styles.chartTitle} size={'small'}>
				Series volume over time · ingested vs retained
			</Typography.Text>
			<div className={styles.chartBody} ref={graphRef}>
				{dimensions.width > 0 && (
					<BarChart
						config={config}
						data={chartData}
						width={dimensions.width}
						height={dimensions.height}
						yAxisUnit="short"
						timezone={timezone}
						legendConfig={{ position: LegendPosition.BOTTOM }}
					/>
				)}
			</div>
		</div>
	);
}

export default VolumeControlChart;
