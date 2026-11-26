import { Color } from '@signozhq/design-tokens';

/** The slice or series summing the groups a chart folds away. */
export const OTHER_GROUP_LABEL = 'Other';

/** Neutral, so the summed remainder never reads as one more group. */
export function resolveOtherColor(isDarkMode: boolean): string {
	return isDarkMode ? Color.BG_SLATE_50 : Color.BG_VANILLA_400;
}
