export function isRangeInverted(
	min: number | null | undefined,
	max: number | null | undefined,
): boolean {
	return min != null && max != null && min > max;
}
