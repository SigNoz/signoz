/** `48.86° N, 2.35° E`: how a point's place reads in the tooltip. */
export function formatCoordinates(lat: number, lon: number): string {
	const latitude = `${Math.abs(lat).toFixed(2)}° ${lat < 0 ? 'S' : 'N'}`;
	const longitude = `${Math.abs(lon).toFixed(2)}° ${lon < 0 ? 'W' : 'E'}`;
	return `${latitude}, ${longitude}`;
}
