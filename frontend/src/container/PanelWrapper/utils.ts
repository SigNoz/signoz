import { defaultStyles } from '@visx/tooltip';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

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

export const getLabel = (
	label: string,
	query: Query,
	queryName: string,
	isQueryContentMultipleResult = false, // If there are more than one aggregation return by the query, this should be set to true. Default is false.
): string => {
	let finalQuery;
	if (!isQueryContentMultipleResult) {
		finalQuery = query.builder.queryData.find((q) => q.queryName === queryName);
		if (!finalQuery) {
			// If the query is not found in queryData, then check in queryFormulas
			finalQuery = query.builder.queryFormulas.find(
				(q) => q.queryName === queryName,
			);
		}
	}
	if (finalQuery) {
		if (finalQuery.legend !== '') {
			return finalQuery.legend;
		}
		if (label !== undefined) {
			return label;
		}
		return queryName;
	}
	return label;
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
	if (!rgbColor) return color; // Return the original color if unable to parse

	// Extract the RGB components
	const { r, g, b } = rgbColor;

	// Create a new RGBA color string with the specified opacity
	return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
