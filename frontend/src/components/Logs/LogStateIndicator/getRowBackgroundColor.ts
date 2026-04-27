import { Color } from '@signozhq/design-tokens';

import { LogType } from './LogStateIndicator';

export function getRowBackgroundColor(
	isDarkMode: boolean,
	logType?: string,
): string {
	if (isDarkMode) {
		switch (logType) {
			case LogType.INFO:
				return `${Color.BG_ROBIN_500}40`;
			case LogType.WARN:
				return `${Color.BG_AMBER_500}40`;
			case LogType.ERROR:
				return `${Color.BG_CHERRY_500}40`;
			case LogType.TRACE:
				return `${Color.BG_FOREST_400}40`;
			case LogType.DEBUG:
				return `${Color.BG_AQUA_500}40`;
			case LogType.FATAL:
				return `${Color.BG_SAKURA_500}40`;
			default:
				return `${Color.BG_ROBIN_500}40`;
		}
	}
	switch (logType) {
		case LogType.INFO:
			return Color.BG_ROBIN_100;
		case LogType.WARN:
			return Color.BG_AMBER_100;
		case LogType.ERROR:
			return Color.BG_CHERRY_100;
		case LogType.TRACE:
			return Color.BG_FOREST_200;
		case LogType.DEBUG:
			return Color.BG_AQUA_100;
		case LogType.FATAL:
			return Color.BG_SAKURA_100;
		default:
			return Color.BG_VANILLA_300;
	}
}
