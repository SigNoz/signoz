/**
 * Parses an offset string like "15m", "1h", "3h", "1d" into milliseconds.
 * Returns null if the string is not a valid offset.
 */
export function parseOffsetToMs(offset: string): number | null {
	const trimmed = offset.trim();
	const match = /^(\d+)([mhd])$/.exec(trimmed);
	if (!match) {
		return null;
	}

	const amount = parseInt(match[1], 10);
	const unit = match[2];

	switch (unit) {
		case 'm':
			return amount * 60 * 1000;
		case 'h':
			return amount * 60 * 60 * 1000;
		case 'd':
			return amount * 24 * 60 * 60 * 1000;
		default:
			return null;
	}
}

/** Clamps a numeric string to [0, max], padding to 2 digits. */
export function clampTimeComponent(value: string, max: number): string {
	const n = parseInt(value, 10);
	if (Number.isNaN(n)) {
		return '00';
	}
	const clamped = Math.max(0, Math.min(max, n));
	return String(clamped).padStart(2, '0');
}

/** Returns true if the given offset string is syntactically valid. */
export function isValidOffset(offset: string): boolean {
	return parseOffsetToMs(offset) !== null;
}
