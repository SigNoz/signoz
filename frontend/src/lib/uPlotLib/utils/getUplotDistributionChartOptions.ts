import { Color } from '@signozhq/design-tokens';
import { themeColors } from 'constants/theme';
import { Dimensions } from 'hooks/useDimensions';
import getLabelName from 'lib/getLabelName';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import _noop from 'lodash-es/noop';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';

import distributionPlugin from '../plugins/distributionPlugin';
import onClickPlugin from '../plugins/onClickPlugin';

type GetUplotDistributionChartOptionsProps = {
	id?: string;
	apiResponse?: MetricRangePayloadProps;
	dimensions: Dimensions;
	isDarkMode: boolean;
	bucketLabels: string[];
	queryName: string;
	legend: string;
	customLegendColors?: Record<string, string>;
	isLogScale?: boolean;
	onClickHandler?: (...args: any[]) => void;
	onHover?: (
		hoverData: { bucketIndex: number; count: number; label: string } | null,
		mousePos: { x: number; y: number },
	) => void;
	tzDate?: (timestamp: number) => Date;
};

export const getUplotDistributionChartOptions = ({
	id,
	dimensions,
	isDarkMode,
	bucketLabels,
	queryName,
	legend,
	customLegendColors,
	isLogScale = false,
	onClickHandler,
	onHover,
	tzDate,
}: GetUplotDistributionChartOptionsProps): uPlot.Options => {
	const axisColor = isDarkMode ? Color.BG_VANILLA_400 : Color.BG_INK_400;
	const legendLabel = getLabelName({}, queryName, legend);
	const barColor =
		customLegendColors?.[legendLabel] ||
		generateColor(
			legendLabel,
			isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
		);

	return {
		id,
		width: dimensions.width,
		height: dimensions.height - 30,
		plugins: [
			distributionPlugin({
				barColor,
				showGrid: true,
				gridColor: isDarkMode ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 1)',
				gridLineWidth: 0.5,
				hoverStroke: isDarkMode ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.50)',
				hoverLineWidth: 2,
				emptyColor: isDarkMode ? 'rgb(18, 20, 22)' : 'rgb(240, 242, 245)',
				onHover,
			}),
			onClickPlugin({
				onClick: onClickHandler ?? _noop,
			}),
		],
		cursor: {
			show: true,
			points: {
				show: false,
			},
		},
		legend: {
			show: true,
			live: false,
			isolate: true,
		},
		axes: [
			{
				show: true,
				stroke: axisColor,
				space: 60,
				values: (_u: uPlot, vals: number[]): string[] =>
					vals.map((v) => bucketLabels[v] || ''),
				grid: { show: false },
			},
			{
				show: true,
				stroke: axisColor,
				grid: { show: false },
			},
		],
		scales: {
			x: {
				range: (_u: uPlot, dataMin: number, dataMax: number): [number, number] => [
					dataMin - 0.5,
					dataMax + 0.5,
				],
			},
			y: {
				distr: isLogScale ? 3 : 1,
				log: isLogScale ? 10 : undefined,
				auto: !isLogScale,
				range: isLogScale
					? (u: uPlot, _min: number, _max: number): [number, number] => {
							const counts = (u.data[1] as number[]).filter((v) => v > 0);
							if (counts.length === 0) {
								return [0.1, 100];
							}

							const minVal = Math.min(...counts);
							const maxVal = Math.max(...counts);

							const minPow = Math.floor(Math.log10(minVal));
							const maxPow = Math.ceil(Math.log10(maxVal));

							return [10 ** minPow, 10 ** maxPow];
					  }
					: undefined,
			},
		},
		series: [
			{ label: 'Bucket' },
			{
				label: legendLabel,
				stroke: barColor,
				fill: barColor,
				paths: (): null => null,
				points: { show: false },
			},
		],
		...(tzDate ? { tzDate } : {}),
	};
};
