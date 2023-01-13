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

export const spanServiceNameToColorMapping = (
	spans: Span[],
): { [key: string]: string } => {
	const serviceNameSet = new Set();
	spans.forEach((spanItem) => {
		serviceNameSet.add(spanItem[3]);
	});
	const serviceToColorMap: { [key: string]: string } = {};
	Array.from(serviceNameSet).forEach((serviceName, idx) => {
		serviceToColorMap[`${serviceName}`] = colors[idx % colors.length];
	});
	return serviceToColorMap;
};

export default getRandomColor;
