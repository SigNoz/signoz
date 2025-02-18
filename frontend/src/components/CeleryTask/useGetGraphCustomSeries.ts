import { Color } from '@signozhq/design-tokens';
import { themeColors } from 'constants/theme';
import getLabelName from 'lib/getLabelName';
import { drawStyles } from 'lib/uPlotLib/utils/constants';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { QueryData } from 'types/api/widgets/getQuery';

import { paths } from './CeleryUtils';

interface UseGetGraphCustomSeriesProps {
	isDarkMode: boolean;
	drawStyle?: typeof drawStyles[keyof typeof drawStyles];
	colorMapping?: Record<string, string>;
}

const defaultColorMapping = {
	SUCCESS: Color.BG_FOREST_500,
	FAILURE: Color.BG_CHERRY_500,
	RETRY: Color.BG_AMBER_400,
};

export const useGetGraphCustomSeries = ({
	isDarkMode,
	drawStyle = 'bars',
	colorMapping = defaultColorMapping,
}: UseGetGraphCustomSeriesProps): {
	getCustomSeries: (data: QueryData[]) => uPlot.Series[];
} => {
	const getGraphSeries = (color: string, label: string): any => ({
		drawStyle,
		paths,
		lineInterpolation: 'spline',
		show: true,
		label,
		fill: `${color}90`,
		stroke: color,
		width: 2,
		spanGaps: true,
		points: {
			size: 5,
			show: false,
			stroke: color,
		},
	});

	const getCustomSeries = (data: QueryData[]): uPlot.Series[] => {
		const configurations: uPlot.Series[] = [
			{ label: 'Timestamp', stroke: 'purple' },
		];

		for (let i = 0; i < data.length; i += 1) {
			const { metric = {}, queryName = '', legend = '' } = data[i] || {};
			const label = getLabelName(metric, queryName || '', legend || '');

			// Check if label exists in colorMapping
			const color =
				colorMapping[label] ||
				generateColor(
					label,
					isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
				);

			const series = getGraphSeries(color, label);
			configurations.push(series);
		}
		return configurations;
	};

	return { getCustomSeries };
};
