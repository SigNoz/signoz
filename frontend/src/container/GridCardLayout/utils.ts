import { FORMULA_REGEXP } from 'constants/regExp';
import { isEmpty, isEqual } from 'lodash-es';
import { Layout } from 'react-grid-layout';
import { Dashboard, Widgets } from 'types/api/dashboard/getAll';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';

export const removeUndefinedValuesFromLayout = (layout: Layout[]): Layout[] =>
	layout.map((obj) =>
		Object.fromEntries(
			Object.entries(obj).filter(([, value]) => value !== undefined),
		),
	) as Layout[];

export const isFormula = (queryName: string): boolean =>
	FORMULA_REGEXP.test(queryName);

/**
 * Extracts query names from a formula expression
 * Specifically targets capital letters A-Z as query names, as after Z we dont have any query names
 */
export function extractQueryNamesFromExpression(expression: string): string[] {
	if (!expression) return [];

	// Use regex to match standalone capital letters
	// Uses word boundaries to ensure we only get standalone letters
	const queryNameRegex = /\b[A-Z]\b/g;

	// Extract matches and deduplicate
	return [...new Set(expression.match(queryNameRegex) || [])];
}

export const hasColumnWidthsChanged = (
	columnWidths: Record<string, Record<string, number>>,
	selectedDashboard?: Dashboard,
): boolean => {
	// If no column widths stored, no changes
	if (isEmpty(columnWidths) || !selectedDashboard) return false;

	// Check each widget's column widths
	return Object.keys(columnWidths).some((widgetId) => {
		const dashboardWidget = selectedDashboard?.data?.widgets?.find(
			(widget) => widget.id === widgetId,
		) as Widgets;

		const newWidths = columnWidths[widgetId];
		const existingWidths = dashboardWidget?.columnWidths;

		// If both are empty/undefined, no change
		if (isEmpty(newWidths) || isEmpty(existingWidths)) return false;

		// Compare stored column widths with dashboard widget's column widths
		return !isEqual(newWidths, existingWidths);
	});
};

/**
 * Calculates the step interval in uPlot points (1 minute = 60 points)
 * based on the time duration between two timestamps in nanoseconds.
 *
 * NOTE: This function is specifically designed for BAR visualization panels only.
 *
 * Conversion logic:
 * - <= 1 hr     → 1 min (60 points)
 * - <= 3 hr     → 2 min (120 points)
 * - <= 5 hr     → 3 min (180 points)
 * - >  5 hr     → max 80 bars, ceil((end-start)/80), rounded to nearest multiple of 5 min
 *
 * @param startNano - start time in nanoseconds
 * @param endNano - end time in nanoseconds
 * @returns stepInterval in uPlot points
 */
export function getBarStepIntervalPoints(
	startNano: number,
	endNano: number,
): number {
	const startMs = startNano;
	const endMs = endNano;
	const durationMs = endMs - startMs;
	const durationMin = durationMs / (60 * 1000); // convert to minutes

	if (durationMin <= 60) {
		return 60; // 1 min
	}
	if (durationMin <= 180) {
		return 120; // 2 min
	}
	if (durationMin <= 300) {
		return 180; // 3 min
	}

	const totalPoints = Math.ceil(durationMs / (1000 * 60)); // total minutes
	const interval = Math.ceil(totalPoints / 80); // at most 80 bars
	const roundedInterval = Math.ceil(interval / 5) * 5; // round up to nearest 5
	return roundedInterval * 60; // convert min to points
}

export function updateBarStepInterval(
	query: Query,
	minTime: number,
	maxTime: number,
): Query {
	const stepIntervalPoints = getBarStepIntervalPoints(minTime, maxTime);

	// if user haven't enter anything manually, that is we have default value of 60 then do the interval adjustment for bar otherwise apply the user's value
	const getBarSteps = (queryData: IBuilderQuery): number | null =>
		!queryData.stepInterval
			? stepIntervalPoints || null
			: queryData?.stepInterval;

	return {
		...query,
		builder: {
			...query?.builder,
			queryData: [
				...(query?.builder?.queryData ?? []).map((queryData) => ({
					...queryData,
					stepInterval: getBarSteps(queryData),
				})),
			],
		},
	};
}
