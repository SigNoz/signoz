import { defaultStyles } from '@visx/tooltip';

export const tooltipStyles = {
	...defaultStyles,
	minWidth: 60,
	backgroundColor: 'rgba(0,0,0,0.9)',
	color: 'white',
	zIndex: 9999,
	display: 'flex',
	gap: '10px',
	justifyContent: 'center',
	alignItems: 'center',
	padding: '5px 10px',
};

// Function to convert a hex color to RGB format
const hexToRgb = (
	color: string,
): { r: number; g: number; b: number } | null => {
	const hex = color.replace(
		/^#?([a-f\d])([a-f\d])([a-f\d])$/i,
		(m, r, g, b) => r + r + g + g + b + b,
	);
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16),
			}
		: null;
};

export const lightenColor = (color: string, opacity: number): string => {
	// Convert the hex color to RGB format
	const rgbColor = hexToRgb(color);
	if (!rgbColor) {
		return color;
	} // Return the original color if unable to parse

	// Extract the RGB components
	const { r, g, b } = rgbColor;

	// Create a new RGBA color string with the specified opacity
	return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const isApmMetric = (metric = ''): boolean =>
	// if metric starts with 'signoz_', then it is an apm metric
	metric.startsWith('signoz_');

export const getTimeRangeFromStepInterval = (
	stepInterval: number,
	xValue: number,
	isApmMetric: boolean,
): { startTime: number; endTime: number } => {
	const startTime = isApmMetric ? xValue - stepInterval : xValue;
	const endTime = xValue + stepInterval;
	return { startTime, endTime };
};
