import { Dimensions } from 'hooks/useDimensions';
import { LegendPosition } from 'types/api/dashboard/getAll';

export interface EnhancedLegendConfig {
	minHeight: number;
	maxHeight: number;
	calculatedHeight: number;
	showScrollbar: boolean;
	requiredRows: number;
	// For right-side legend
	minWidth?: number;
	maxWidth?: number;
	calculatedWidth?: number;
}

/**
 * Calculate legend configuration based on panel dimensions and series count
 * Prioritizes chart space while ensuring legend usability
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export function calculateEnhancedLegendConfig(
	dimensions: Dimensions,
	seriesCount: number,
	seriesLabels?: string[],
	legendPosition: LegendPosition = LegendPosition.BOTTOM,
): EnhancedLegendConfig {
	const lineHeight = 34;
	const padding = 12;
	const maxRowsToShow = 2; // Reduced from 3 to 2 for better chart/legend ratio

	// Different configurations for bottom vs right positioning
	if (legendPosition === LegendPosition.RIGHT) {
		// Right-side legend configuration
		const maxLegendWidthRatio = 0.3; // Legend should not take more than 30% of panel width
		const absoluteMaxWidth = Math.min(
			400,
			dimensions.width * maxLegendWidthRatio,
		);
		const minWidth = 150;

		// For right-side legend, calculate based on text length
		const avgCharWidth = 8;
		let avgTextLength = 15;
		if (seriesLabels && seriesLabels.length > 0) {
			const totalLength = seriesLabels.reduce(
				(sum, label) => sum + Math.min(label.length, 40),
				0,
			);
			avgTextLength = Math.max(
				10,
				Math.min(35, totalLength / seriesLabels.length),
			);
		}

		// Fix: Ensure width respects the ratio constraint even if it's less than minWidth
		const estimatedWidth = 80 + avgCharWidth * avgTextLength;
		const calculatedWidth = Math.min(
			Math.max(minWidth, estimatedWidth),
			absoluteMaxWidth,
		);

		// For right-side legend, height can be more flexible
		const maxHeight = dimensions.height - 40; // Leave some padding
		const idealHeight = seriesCount * lineHeight + padding;
		const calculatedHeight = Math.min(idealHeight, maxHeight);
		const showScrollbar = idealHeight > calculatedHeight;

		return {
			minHeight: lineHeight + padding,
			maxHeight,
			calculatedHeight,
			showScrollbar,
			requiredRows: seriesCount, // Each series on its own row for right-side
			minWidth,
			maxWidth: absoluteMaxWidth,
			calculatedWidth,
		};
	}

	// Bottom legend configuration (existing logic)
	const maxLegendRatio = 0.15;
	// Fix: For very small dimensions, respect the ratio instead of using fixed 80px minimum
	const ratioBasedMaxHeight = dimensions.height * maxLegendRatio;

	// Handle edge cases and calculate absolute max height
	let absoluteMaxHeight;
	if (dimensions.height <= 0) {
		absoluteMaxHeight = 46; // Fallback for invalid dimensions
	} else if (dimensions.height <= 400) {
		// For small to medium panels, prioritize ratio constraint
		absoluteMaxHeight = Math.min(80, Math.max(15, ratioBasedMaxHeight));
	} else {
		// For larger panels, maintain a reasonable minimum
		absoluteMaxHeight = Math.min(80, Math.max(20, ratioBasedMaxHeight));
	}

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
	let requiredRows = Math.ceil(seriesCount / itemsPerRow);

	if (requiredRows === 1 && seriesCount > 3) {
		requiredRows = 2;
	}

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

	// For very small dimensions, allow the minHeight to be smaller to respect ratio constraints
	if (dimensions.height < 200) {
		minHeight = Math.min(minHeight, absoluteMaxHeight);
	}

	// Maximum height constraint - prioritize chart space
	// Fix: Ensure we respect the ratio-based constraint for small dimensions
	const rowBasedMaxHeight = maxRowsToShow * lineHeight + padding;
	const maxHeight = Math.min(rowBasedMaxHeight, absoluteMaxHeight);

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

// CSS class constants
const LEGEND_SINGLE_LINE_CLASS = 'u-legend-single-line';
const LEGEND_MULTI_LINE_CLASS = 'u-legend-multi-line';
const LEGEND_RIGHT_ALIGNED_CLASS = 'u-legend-right-aligned';

/**
 * Apply enhanced legend styling to a legend element
 */
export function applyEnhancedLegendStyling(
	legend: HTMLElement,
	config: EnhancedLegendConfig,
	requiredRows: number,
	legendPosition: LegendPosition = LegendPosition.BOTTOM,
): void {
	const legendElement = legend;
	legendElement.classList.add('u-legend-enhanced');

	// Apply position-specific styling
	if (legendPosition === LegendPosition.RIGHT) {
		legendElement.classList.add('u-legend-right');
		legendElement.classList.remove('u-legend-bottom');

		// Set width for right-side legend
		if (config.calculatedWidth) {
			legendElement.style.width = `${config.calculatedWidth}px`;
			legendElement.style.minWidth = `${config.minWidth}px`;
			legendElement.style.maxWidth = `${config.maxWidth}px`;
		}

		// Height for right-side legend
		legendElement.style.height = `${config.calculatedHeight}px`;
		legendElement.style.minHeight = `${config.minHeight}px`;
		legendElement.style.maxHeight = `${config.maxHeight}px`;
	} else {
		legendElement.classList.add('u-legend-bottom');
		legendElement.classList.remove('u-legend-right');

		// Height for bottom legend
		legendElement.style.height = `${config.calculatedHeight}px`;
		legendElement.style.minHeight = `${config.minHeight}px`;
		legendElement.style.maxHeight = `${config.maxHeight}px`;

		// Reset width for bottom legend
		legendElement.style.width = '';
		legendElement.style.minWidth = '';
		legendElement.style.maxWidth = '';
	}

	// Apply alignment based on position and number of rows
	if (legendPosition === LegendPosition.RIGHT) {
		legendElement.classList.add(LEGEND_RIGHT_ALIGNED_CLASS);
		legendElement.classList.remove(
			LEGEND_SINGLE_LINE_CLASS,
			LEGEND_MULTI_LINE_CLASS,
		);
	} else if (requiredRows === 1) {
		legendElement.classList.add(LEGEND_SINGLE_LINE_CLASS);
		legendElement.classList.remove(
			LEGEND_MULTI_LINE_CLASS,
			LEGEND_RIGHT_ALIGNED_CLASS,
		);
	} else {
		legendElement.classList.add(LEGEND_MULTI_LINE_CLASS);
		legendElement.classList.remove(
			LEGEND_SINGLE_LINE_CLASS,
			LEGEND_RIGHT_ALIGNED_CLASS,
		);
	}

	// Add scrollbar indicator if needed
	if (config.showScrollbar) {
		legendElement.classList.add('u-legend-scrollable');
	} else {
		legendElement.classList.remove('u-legend-scrollable');
	}
}
