import { GeoMapPoint } from '../../types';
import { seededRandom } from './seededRandom';

// [name, lat, lon]
const CITIES: [string, number, number][] = [
	['New York', 40.71, -74.01],
	['Los Angeles', 34.05, -118.24],
	['Chicago', 41.88, -87.63],
	['Houston', 29.76, -95.37],
	['Seattle', 47.61, -122.33],
	['San Francisco', 37.77, -122.42],
	['Miami', 25.76, -80.19],
	['Toronto', 43.65, -79.38],
	['Vancouver', 49.28, -123.12],
	['Montreal', 45.5, -73.57],
	['Mexico City', 19.43, -99.13],
	['Bogotá', 4.71, -74.07],
	['Lima', -12.05, -77.04],
	['São Paulo', -23.55, -46.63],
	['Rio de Janeiro', -22.91, -43.17],
	['Buenos Aires', -34.6, -58.38],
	['Santiago', -33.45, -70.67],
	['London', 51.51, -0.13],
	['Dublin', 53.35, -6.26],
	['Paris', 48.86, 2.35],
	['Madrid', 40.42, -3.7],
	['Lisbon', 38.72, -9.14],
	['Amsterdam', 52.37, 4.9],
	['Berlin', 52.52, 13.4],
	['Frankfurt', 50.11, 8.68],
	['Zurich', 47.38, 8.54],
	['Milan', 45.46, 9.19],
	['Rome', 41.9, 12.5],
	['Stockholm', 59.33, 18.07],
	['Warsaw', 52.23, 21.01],
	['Vienna', 48.21, 16.37],
	['Istanbul', 41.01, 28.98],
	['Moscow', 55.76, 37.62],
	['Cairo', 30.04, 31.24],
	['Lagos', 6.52, 3.38],
	['Nairobi', -1.29, 36.82],
	['Johannesburg', -26.2, 28.05],
	['Cape Town', -33.92, 18.42],
	['Dubai', 25.2, 55.27],
	['Riyadh', 24.71, 46.68],
	['Tel Aviv', 32.09, 34.78],
	['Mumbai', 19.08, 72.88],
	['Delhi', 28.61, 77.21],
	['Bengaluru', 12.97, 77.59],
	['Chennai', 13.08, 80.27],
	['Hyderabad', 17.39, 78.49],
	['Kolkata', 22.57, 88.36],
	['Dhaka', 23.81, 90.41],
	['Bangkok', 13.76, 100.5],
	['Singapore', 1.35, 103.82],
	['Jakarta', -6.21, 106.85],
	['Manila', 14.6, 120.98],
	['Ho Chi Minh City', 10.82, 106.63],
	['Hong Kong', 22.32, 114.17],
	['Shanghai', 31.23, 121.47],
	['Beijing', 39.9, 116.41],
	['Seoul', 37.57, 126.98],
	['Tokyo', 35.68, 139.69],
	['Osaka', 34.69, 135.5],
	['Sydney', -33.87, 151.21],
	['Melbourne', -37.81, 144.96],
	['Auckland', -36.85, 174.76],
];

// Big hubs carry most traffic; the rest is a long tail.
const HUBS = new Set([
	'New York',
	'London',
	'Frankfurt',
	'Bengaluru',
	'Singapore',
	'Tokyo',
	'São Paulo',
]);

/** p95 latency per city, sized by requests: synthetic but stable across runs. */
export function cityLatency(): GeoMapPoint[] {
	const random = seededRandom(59);
	return CITIES.map(([name, lat, lon], index) => ({
		id: `city-${index}`,
		lat,
		lon,
		label: name,
		value: Math.round(60 + Math.pow(random(), 2) * 900),
		size: HUBS.has(name)
			? Math.round(300_000 + random() * 600_000)
			: Math.round(2_000 + Math.pow(random(), 3) * 150_000),
	}));
}

/** The panel's point cap: rows beyond it are dropped with a warning. */
export const MAX_POINTS = 100_000;

/**
 * Requests from `count` points scattered around the cities, denser near
 * hubs: the heaviest map the panel draws.
 */
export function manyPoints(count = MAX_POINTS): GeoMapPoint[] {
	const random = seededRandom(97);
	// Box–Muller: scatter falls off around each city instead of filling a square.
	const gaussian = (): number =>
		Math.sqrt(-2 * Math.log(random() || Number.EPSILON)) *
		Math.cos(2 * Math.PI * random());
	return Array.from({ length: count }, (_, index) => {
		const [name, lat, lon] = CITIES[Math.floor(random() * CITIES.length)];
		const spread = HUBS.has(name) ? 1.5 : 3;
		const pointLat = Math.max(-58, Math.min(75, lat + gaussian() * spread));
		const pointLon = Math.max(-180, Math.min(180, lon + gaussian() * spread));
		return {
			id: `pt-${index}`,
			lat: Math.round(pointLat * 100) / 100,
			lon: Math.round(pointLon * 100) / 100,
			label: `Near ${name}`,
			value: Math.round(Math.pow(random(), 3) * 5_000),
		};
	});
}
