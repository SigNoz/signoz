/**
 * V2-native threshold model. The spec carries thresholds as DTOs (operator as
 * `above`/`below`/…); this maps them to symbol operators + lowercase formats so
 * V2 panels never reach into the V1 `container/NewWidget` `ThresholdProps` shape.
 */

import type {
	DashboardtypesComparisonOperatorDTO,
	DashboardtypesThresholdFormatDTO,
} from 'api/generated/services/sigNoz.schemas';

/**
 * Comparison-shaped fields shared by every threshold DTO that recolors on an
 * operator crossing. Container DTOs add their own keys (e.g. a table threshold's
 * `columnName`) around this core.
 */
export interface ComparisonThresholdShape {
	color: string;
	value: number;
	operator?: DashboardtypesComparisonOperatorDTO;
	unit?: string;
	format?: DashboardtypesThresholdFormatDTO;
}

/** SigNoz threshold palette; single source of truth for the hex values. */
export enum ThresholdColor {
	RED = '#F1575F',
	ORANGE = '#F5B225',
	GREEN = '#2BB673',
	BLUE = '#4E74F8',
}

/** Palette ordered most-dangerous first (preset order + alert-severity ranking). */
export const THRESHOLD_COLOR_DANGER_ORDER: ThresholdColor[] = [
	ThresholdColor.RED,
	ThresholdColor.ORANGE,
	ThresholdColor.GREEN,
	ThresholdColor.BLUE,
];

/** Comparison operators a threshold can use, as evaluable symbols. */
export type ThresholdComparisonOperator = '>' | '<' | '>=' | '<=' | '=' | '!=';

/** How a matched threshold recolors the panel. */
export type ThresholdDisplayFormat = 'text' | 'background';

/**
 * A threshold normalized for evaluation/rendering. `operator`/`format` are
 * optional because the spec allows partial config; a threshold with no operator
 * never matches.
 */
export interface PanelThreshold {
	color: string;
	operator?: ThresholdComparisonOperator;
	value: number;
	/** Unit the threshold value is expressed in; converted to the panel unit before comparison. */
	unit?: string;
	format?: ThresholdDisplayFormat;
}
