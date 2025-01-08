/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { Color } from '@signozhq/design-tokens';

/**
 * Converts size in bytes to a human-readable string with appropriate units
 */
export function formatBytes(bytes: number, decimals = 2): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / k ** i).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Wrapper component that renders its children for valid values or renders '-' for invalid values (-1)
 */
export function ValidateColumnValueWrapper({
	children,
	value,
}: {
	children: React.ReactNode;
	value: number;
}): JSX.Element {
	if (value === -1) {
		return <div>-</div>;
	}

	return <div>{children}</div>;
}

/**
 * Returns stroke color for request utilization parameters according to current value
 */
export function getStrokeColorForRequestUtilization(value: number): string {
	const percent = Number((value * 100).toFixed(1));
	// Orange
	if (percent <= 50) {
		return Color.BG_AMBER_500;
	}
	// Green
	if (percent > 50 && percent <= 100) {
		return Color.BG_FOREST_500;
	}
	// Regular Red
	if (percent > 100 && percent <= 150) {
		return Color.BG_SAKURA_500;
	}
	// Dark Red
	return Color.BG_CHERRY_600;
}

/**
 * Returns stroke color for limit utilization parameters according to current value
 */
export function getStrokeColorForLimitUtilization(value: number): string {
	const percent = Number((value * 100).toFixed(1));
	// Green
	if (percent <= 60) {
		return Color.BG_FOREST_500;
	}
	// Yellow
	if (percent > 60 && percent <= 80) {
		return Color.BG_AMBER_200;
	}
	// Orange
	if (percent > 80 && percent <= 95) {
		return Color.BG_AMBER_500;
	}
	// Red
	return Color.BG_SAKURA_500;
}

export const getProgressBarText = (percent: number): React.ReactNode =>
	`${percent}%`;
