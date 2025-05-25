import { Dimensions } from 'hooks/useDimensions';

export interface EnhancedLegendConfig {
	minHeight: number;
	maxHeight: number;
	calculatedHeight: number;
	showScrollbar: boolean;
	requiredRows: number;
}

/**
 * Calculate legend configuration based on panel dimensions and series count
 * Prioritizes chart space while ensuring legend usability
 */
export function calculateEnhancedLegendConfig(
	dimensions: Dimensions,
	seriesCount: number,
	seriesLabels?: string[],
): EnhancedLegendConfig {
	const lineHeight = 34;
	const padding = 12;
	const maxRowsToShow = 2; // Reduced from 3 to 2 for better chart/legend ratio

	// Legend should not take more than 15% of panel height, with absolute max of 80px
	const maxLegendRatio = 0.15;
	const absoluteMaxHeight = Math.min(80, dimensions.height * maxLegendRatio);

	const baseItemWidth = 44;
	const avgCharWidth = 8;

	let avgTextLength = 15;
	if (seriesLabels && seriesLabels.length > 0) {
		const totalLength = seriesLabels.reduce(
			(sum, label) => sum + Math.min(label.length, 30),
			0,
		);
		avgTextLength = Math.max(8, Math.min(25, totalLength / seriesLabels.length));
	}

	// Estimate item width based on actual or estimated text length
	let estimatedItemWidth = baseItemWidth + avgCharWidth * avgTextLength;

	// For very wide panels, allow longer text
	if (dimensions.width > 800) {
		estimatedItemWidth = Math.max(
			estimatedItemWidth,
			baseItemWidth + avgCharWidth * 22,
		);
	} else if (dimensions.width < 400) {
		estimatedItemWidth = Math.min(
			estimatedItemWidth,
			baseItemWidth + avgCharWidth * 14,
		);
	}

	// Calculate items per row based on available width
	const availableWidth = dimensions.width - padding * 2;
	const itemsPerRow = Math.max(
		1,
		Math.floor(availableWidth / estimatedItemWidth),
	);
	const requiredRows = Math.ceil(seriesCount / itemsPerRow);

	// Calculate heights
	const idealHeight = requiredRows * lineHeight + padding;

	// For single row, use minimal height
	let minHeight;
	if (requiredRows <= 1) {
		minHeight = lineHeight + padding; // Single row
	} else {
		// Multiple rows: show 2 rows max, then scroll
		minHeight = Math.min(2 * lineHeight + padding, idealHeight);
	}

	// Maximum height constraint - prioritize chart space
	const maxHeight = Math.min(
		maxRowsToShow * lineHeight + padding,
		absoluteMaxHeight,
	);

	const calculatedHeight = Math.max(minHeight, Math.min(idealHeight, maxHeight));
	const showScrollbar = idealHeight > calculatedHeight;

	return {
		minHeight,
		maxHeight,
		calculatedHeight,
		showScrollbar,
		requiredRows,
	};
}

/**
 * Apply enhanced legend styling to a legend element
 */
export function applyEnhancedLegendStyling(
	legend: HTMLElement,
	config: EnhancedLegendConfig,
	requiredRows: number,
): void {
	const legendElement = legend;
	legendElement.classList.add('u-legend-enhanced');
	legendElement.style.height = `${config.calculatedHeight}px`;
	legendElement.style.minHeight = `${config.minHeight}px`;
	legendElement.style.maxHeight = `${config.maxHeight}px`;

	// Apply alignment based on number of rows
	if (requiredRows === 1) {
		legendElement.classList.add('u-legend-single-line');
		legendElement.classList.remove('u-legend-multi-line');
	} else {
		legendElement.classList.add('u-legend-multi-line');
		legendElement.classList.remove('u-legend-single-line');
	}

	// Add scrollbar indicator if needed
	if (config.showScrollbar) {
		legendElement.classList.add('u-legend-scrollable');
	} else {
		legendElement.classList.remove('u-legend-scrollable');
	}
}
