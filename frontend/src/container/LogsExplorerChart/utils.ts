import { Color } from '@signozhq/design-tokens';
import { themeColors } from 'constants/theme';
import { colors } from 'lib/getRandomColor';

export function getColorsForSeverityLabels(
	label: string,
	index: number,
): string {
	switch (label) {
		case '{severity_text="TRACE"}':
		case '{severity_text="trace"}':
			return Color.BG_ROBIN_300;
		case '{severity_text="DEBUG"}':
		case '{severity_text="debug"}':
			return Color.BG_FOREST_500;
		case '{severity_text="INFO"}':
		case '{severity_text="info"}':
			return Color.BG_SLATE_400;
		case '{severity_text="WARN"}':
		case '{severity_text="warn"}':
			return Color.BG_AMBER_500;
		case '{severity_text="ERROR"}':
		case '{severity_text="error"}':
			return Color.BG_CHERRY_500;
		case '{severity_text="FATAL"}':
		case '{severity_text="fatal"}':
			return Color.BG_SAKURA_500;
		default:
			// if the severity label is not found, return a random color
			return colors[index % colors.length] || themeColors.red;
	}
}
