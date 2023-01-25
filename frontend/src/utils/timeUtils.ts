export function toUTCEpoch(time: number): number {
	const x = new Date();
	return time + x.getTimezoneOffset() * 60 * 1000;
}
