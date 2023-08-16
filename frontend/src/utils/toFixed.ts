export function toFixed(input: number, fixedCount: number): number | string {
	if (input.toString().split('.').length > 1) {
		return input.toFixed(fixedCount);
	}
	return input;
}
