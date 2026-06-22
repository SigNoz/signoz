/**
 * V2-native threshold model.
 *
 * The panel spec carries thresholds as `DashboardtypesComparisonThresholdDTO`
 * (operator/format expressed as `above`/`below`/`text`/`background`). For
 * evaluation and rendering we work with the symbol operators and lowercase
 * display formats, kept here so V2 panels never reach into the V1
 * `container/NewWidget` `ThresholdProps` shape.
 */

import type {
	DashboardtypesComparisonOperatorDTO,
	DashboardtypesThresholdFormatDTO,
} from 'api/generated/services/sigNoz.schemas';

/**
 * The comparison-shaped fields shared by every panel-spec threshold DTO that
 * recolors on an operator crossing (`ComparisonThresholdDTO`,
 * `TableThresholdDTO`). The container DTOs add their own keys (e.g. a table
 * threshold's `columnName`) around this common core.
 */
export interface ComparisonThresholdShape {
	color: string;
	value: number;
	operator?: DashboardtypesComparisonOperatorDTO;
	unit?: string;
	format?: DashboardtypesThresholdFormatDTO;
}

/** Comparison operators a threshold can use, as evaluable symbols. */
export type ThresholdComparisonOperator = '>' | '<' | '>=' | '<=' | '=' | '!=';

/** How a matched threshold recolors the panel. */
export type ThresholdDisplayFormat = 'text' | 'background';

/**
 * A threshold normalized for evaluation/rendering. `operator`/`format` are
 * optional because the spec allows partially-configured thresholds; a
 * threshold with no operator never matches.
 */
export interface PanelThreshold {
	color: string;
	operator?: ThresholdComparisonOperator;
	value: number;
	/** Unit the threshold value is expressed in; converted to the panel unit before comparison. */
	unit?: string;
	format?: ThresholdDisplayFormat;
}
