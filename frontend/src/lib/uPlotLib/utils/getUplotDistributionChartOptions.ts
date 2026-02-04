import { themeColors } from 'constants/theme';
import { Dimensions } from 'hooks/useDimensions';
import getLabelName from 'lib/getLabelName';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import _noop from 'lodash-es/noop';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';

import onClickPlugin from '../plugins/onClickPlugin';
import tooltipPlugin from '../plugins/tooltipPlugin';
import getAxes from './getAxes';
import { toggleSeriesVisibility } from './getSeriesData';

export type DistributionSeriesConfig = {
	name: string;
	legend: string;
	queryName: string;
	labels?: Record<string, string>;
};

type GetUplotDistributionChartOptionsProps = {
	id?: string;
	apiResponse?: MetricRangePayloadProps;
	dimensions: Dimensions;
	isDarkMode: boolean;
	bucketLabels: string[];
	seriesConfigs: DistributionSeriesConfig[];
	customLegendColors?: Record<string, string>;
	isLogScale?: boolean;
	graphsVisibilityStates?: boolean[];
	setGraphsVisibilityStates?: (
		updater: boolean[] | ((prev: boolean[]) => boolean[]),
	) => void;
	onClickHandler?: (...args: any[]) => void;
	onBucketZoom?: (startBucket: number, endBucket: number) => void;
	tzDate?: (timestamp: number) => Date;
};

const { bars } = uPlot.paths;

const paths = (
	u: uPlot,
	seriesIdx: number,
	idx0: number,
	idx1: number,
): uPlot.Series.Paths | null => {
	const renderer = bars && bars({ size: [0.6], align: 0 });
	return (renderer && renderer(u, seriesIdx, idx0, idx1)) || null;
};

const createAxesConfig = (
	isDarkMode: boolean,
	isLogScale: boolean,
	bucketLabels: string[],
): uPlot.Axis[] => {
	const baseAxes = getAxes({ isDarkMode, isLogScale });
	return [
		{
			...baseAxes[0],
			space: 60,
			values: (_u: uPlot, vals: number[]): string[] =>
				vals.map((v) => bucketLabels[v] || ''),
		},
		baseAxes[1],
	];
};

const createSeriesConfig = (
	seriesConfigs: DistributionSeriesConfig[],
	isDarkMode: boolean,
	customLegendColors?: Record<string, string>,
	graphsVisibilityStates?: boolean[],
): uPlot.Series[] => {
	const bucketSeries: uPlot.Series = { label: 'Bucket' };

	const dataSeries = seriesConfigs.map((config, idx) => {
		const label =
			config.name ||
			getLabelName(config.labels || {}, config.queryName, config.legend);
		const color =
			customLegendColors?.[label] ||
			generateColor(
				label,
				isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
			);

		return {
			label,
			stroke: color,
			fill: `${color}40`,
			width: 2,
			paths,
			show: graphsVisibilityStates ? graphsVisibilityStates[idx + 1] : true,
			points: { show: false },
		};
	});

	return [bucketSeries, ...dataSeries];
};

const calculateLogScaleRange = (u: uPlot): [number, number] => {
	const allCounts: number[] = [];
	for (let i = 1; i < u.data.length; i += 1) {
		const sData = u.data[i] as number[];
		if (sData) {
			allCounts.push(...sData);
		}
	}

	const counts = allCounts.filter((v) => v > 0);
	if (counts.length === 0) {
		return [0.1, 100];
	}

	const minVal = Math.min(...counts);
	const maxVal = Math.max(...counts);
	const minPow = Math.floor(Math.log10(minVal));
	const maxPow = Math.ceil(Math.log10(maxVal));

	return [10 ** minPow, 10 ** maxPow];
};

const createBucketZoomHandler = (
	onBucketZoom: (startBucket: number, endBucket: number) => void,
) => (self: uPlot): void => {
	const selection = self.select;
	if (!selection) {
		return;
	}

	const startBucket = Math.floor(self.posToVal(selection.left, 'x'));
	const endBucket = Math.ceil(
		self.posToVal(selection.left + selection.width, 'x'),
	);

	if (endBucket > startBucket) {
		onBucketZoom(startBucket, endBucket);
	}
};

/* eslint-disable sonarjs/cognitive-complexity */
export const getUplotDistributionChartOptions = ({
	id,
	apiResponse,
	dimensions,
	isDarkMode,
	bucketLabels,
	seriesConfigs,
	customLegendColors,
	isLogScale = false,
	graphsVisibilityStates,
	setGraphsVisibilityStates,
	onClickHandler,
	onBucketZoom,
	tzDate,
}: GetUplotDistributionChartOptionsProps): uPlot.Options => {
	const axes = createAxesConfig(isDarkMode, isLogScale, bucketLabels);
	const series = createSeriesConfig(
		seriesConfigs,
		isDarkMode,
		customLegendColors,
		graphsVisibilityStates,
	);

	const hooks: uPlot.Hooks.Arrays = {};

	if (setGraphsVisibilityStates && graphsVisibilityStates) {
		hooks.ready = [
			(self: uPlot): void => {
				const legend = self.root.querySelector('.u-legend');
				if (!legend) {
					return;
				}

				const seriesEls = legend.querySelectorAll('.u-series');
				const seriesArray = Array.from(seriesEls);

				seriesArray.forEach((seriesEl, index) => {
					const thElement = seriesEl.querySelector('th');
					if (!thElement) {
						return;
					}

					const newThElement = thElement.cloneNode(true) as HTMLElement;
					thElement.parentNode?.replaceChild(newThElement, thElement);

					newThElement.addEventListener('click', (e) => {
						e.preventDefault();
						e.stopPropagation();

						setGraphsVisibilityStates((prev) =>
							toggleSeriesVisibility(prev, index + 1),
						);
					});
				});
			},
		];
	}

	if (onBucketZoom) {
		hooks.setSelect = [createBucketZoomHandler(onBucketZoom)];
	}

	return {
		id,
		width: dimensions.width,
		height: dimensions.height - 30,
		padding: [16, 16, 8, 16],
		plugins: [
			tooltipPlugin({
				apiResponse,
				isDarkMode,
				isDistributionChart: true,
				bucketLabels,
				colorMapping: customLegendColors,
			}),
			onClickPlugin({
				onClick: onClickHandler ?? _noop,
				apiResponse,
			}),
		],
		cursor: {
			show: true,
			points: {
				show: false,
			},
			...(onBucketZoom
				? {
						drag: {
							x: true,
							y: false,
						},
				  }
				: {}),
		},
		legend: {
			show: true,
			live: false,
		},
		axes,
		scales: {
			x: {
				time: false,
				range: (_u: uPlot, dataMin: number, dataMax: number): [number, number] => [
					dataMin - 0.5,
					dataMax + 0.5,
				],
			},
			y: {
				distr: isLogScale ? 3 : 1,
				log: isLogScale ? 10 : undefined,
				auto: !isLogScale,
				range: isLogScale ? calculateLogScaleRange : undefined,
			},
		},
		hooks,
		series,
		...(tzDate ? { tzDate } : {}),
	};
};
