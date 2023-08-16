import { Span } from 'types/api/trace/getTraceItem';

import { themeColors } from '../constants/theme';

export const colors = Object.values(themeColors.chartcolors);

export function getRandomNumber(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

const getRandomColor = (): string => {
	const index = parseInt(getRandomNumber(0, colors.length - 1).toString(), 10);
	return colors[index];
};

export const SIGNOZ_UI_COLOR_HEX = 'signoz_ui_color_hex';

export const spanServiceNameToColorMapping = (
	spans: Span[],
): { [key: string]: string } => {
	const allServiceMap = new Map<string, string | undefined>();

	spans.forEach((spanItem) => {
		const signozUiColorKeyIndex = spanItem[7].findIndex(
			(span) => span === SIGNOZ_UI_COLOR_HEX,
		);

		allServiceMap.set(
			spanItem[3],
			signozUiColorKeyIndex === -1
				? undefined
				: spanItem[8][signozUiColorKeyIndex],
		);
	});

	const serviceToColorMap: { [key: string]: string } = {};

	Array.from(allServiceMap).forEach(([serviceName, signozColor], idx) => {
		serviceToColorMap[`${serviceName}`] =
			signozColor || colors[idx % colors.length];
	});

	return serviceToColorMap;
};

export default getRandomColor;
