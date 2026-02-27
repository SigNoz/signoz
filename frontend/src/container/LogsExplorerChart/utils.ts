import { Color } from '@signozhq/design-tokens';
import { colors } from 'lib/getRandomColor';

// Function to determine if a color is "red-like" based on its RGB values
export function isRedLike(hex: string): boolean {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return r > 180 && r > g * 1.4 && r > b * 1.4;
}

const SAFE_FALLBACK_COLORS = colors.filter((c) => !isRedLike(c));

const SEVERITY_VARIANT_COLORS: Record<string, string> = {
	TRACE: Color.BG_FOREST_600,
	Trace: Color.BG_FOREST_500,
	trace: Color.BG_FOREST_400,
	trc: Color.BG_FOREST_300,
	Trc: Color.BG_FOREST_200,

	DEBUG: Color.BG_AQUA_600,
	Debug: Color.BG_AQUA_500,
	debug: Color.BG_AQUA_400,
	dbg: Color.BG_AQUA_300,
	Dbg: Color.BG_AQUA_200,

	INFO: Color.BG_ROBIN_600,
	Info: Color.BG_ROBIN_500,
	info: Color.BG_ROBIN_400,
	Information: Color.BG_ROBIN_300,
	information: Color.BG_ROBIN_200,

	WARN: Color.BG_AMBER_600,
	Warn: Color.BG_AMBER_500,
	warn: Color.BG_AMBER_400,
	warning: Color.BG_AMBER_300,
	Warning: Color.BG_AMBER_200,
	wrn: Color.BG_AMBER_300,
	Wrn: Color.BG_AMBER_200,

	ERROR: Color.BG_CHERRY_600,
	Error: Color.BG_CHERRY_500,
	error: Color.BG_CHERRY_400,
	err: Color.BG_CHERRY_300,
	Err: Color.BG_CHERRY_200,
	ERR: Color.BG_CHERRY_600,
	fail: Color.BG_CHERRY_400,
	Fail: Color.BG_CHERRY_300,
	FAIL: Color.BG_CHERRY_600,

	FATAL: Color.BG_SAKURA_600,
	Fatal: Color.BG_SAKURA_500,
	fatal: Color.BG_SAKURA_400,
	critical: Color.BG_SAKURA_300,
	Critical: Color.BG_SAKURA_200,
	CRITICAL: Color.BG_SAKURA_600,
	crit: Color.BG_SAKURA_300,
	Crit: Color.BG_SAKURA_200,
	CRIT: Color.BG_SAKURA_600,
	panic: Color.BG_SAKURA_400,
	Panic: Color.BG_SAKURA_300,
	PANIC: Color.BG_SAKURA_600,
};

// Simple function to get severity color for any component
export function getSeverityColor(severityText: string): string {
	const variantColor = SEVERITY_VARIANT_COLORS[severityText.trim()];
	if (variantColor) {
		return variantColor;
	}

	return Color.BG_ROBIN_500; // Default fallback
}

export function getColorsForSeverityLabels(
	label: string,
	index: number,
): string {
	const trimmed = label.trim();

	if (!trimmed) {
		return Color.BG_SLATE_300;
	}

	const variantColor = SEVERITY_VARIANT_COLORS[trimmed];
	if (variantColor) {
		return variantColor;
	}

	const lowerCaseLabel = label.toLowerCase();

	// Fallback to old format for backward compatibility
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

	return (
		SAFE_FALLBACK_COLORS[index % SAFE_FALLBACK_COLORS.length] ||
		Color.BG_SLATE_400
	);
}
