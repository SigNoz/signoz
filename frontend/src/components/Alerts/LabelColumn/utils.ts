export const BADGE_GAP = 4;
export const OVERFLOW_BADGE_WIDTH = 40;

export const BADGE_MAX_WIDTH = 180;
export const BADGE_PADDING = 16;
export const CHAR_WIDTH = 7;

export function estimateBadgeWidth(label: string, value?: string): number {
	const displayText = value ? `${label}: ${value}` : label;
	return Math.min(
		displayText.length * CHAR_WIDTH + BADGE_PADDING,
		BADGE_MAX_WIDTH,
	);
}
