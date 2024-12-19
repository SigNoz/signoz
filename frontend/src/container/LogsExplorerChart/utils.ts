import { Color } from '@signozhq/design-tokens';
import { themeColors } from 'constants/theme';
import { colors } from 'lib/getRandomColor';

export function getColorsForSeverityLabels(
	label: string,
	index: number,
): string {
	const lowerCaseLabel = label.toLowerCase();

	if (lowerCaseLabel.includes(`{severity_text="trace"}`)) {
		return Color.BG_FOREST_400;
	}

	if (lowerCaseLabel.includes(`{severity_text="debug"}`)) {
		return Color.BG_AQUA_500;
	}

	if (
		lowerCaseLabel.includes(`{severity_text="info"}`) ||
		lowerCaseLabel.includes(`{severity_text=""}`)
	) {
		return Color.BG_ROBIN_500;
	}

	if (lowerCaseLabel.includes(`{severity_text="warn"}`)) {
		return Color.BG_AMBER_500;
	}

	if (lowerCaseLabel.includes(`{severity_text="error"}`)) {
		return Color.BG_CHERRY_500;
	}

	if (lowerCaseLabel.includes(`{severity_text="fatal"}`)) {
		return Color.BG_SAKURA_500;
	}

	return colors[index % colors.length] || themeColors.red;
}
