import { COUNTRIES } from '../../geo/countries';
import { seededRandom } from './seededRandom';
import { cityLatency, manyPoints } from './pointFixtures';
import { indiaLatency, usRequests } from './stateFixtures';
import { Fixture, FixtureDataset, FixtureRow } from './types';

const ISO2S = COUNTRIES.map((country) => country.properties.code).filter(
	(iso2): iso2 is string => Boolean(iso2),
);

// Spellings a real pipeline produces: lowercase, alpha-3, names, junk, duplicates.
const MESSY_ROWS: FixtureRow[] = [
	{ raw: 'usa', value: 1 },
	{ raw: 'deu', value: 1 },
	{ raw: 'Brazil', value: 1 },
	{ raw: ' in ', value: 1 },
	{ raw: 'UK', value: 1 },
	{ raw: 'A1', value: 3 },
	{ raw: 'EU', value: 2 },
	{ raw: 'ZZ', value: 1 },
	{ raw: '', value: 5 },
	{ raw: null, value: 4 },
];

function errorRate(): FixtureRow[] {
	const random = seededRandom(7);
	const rows = ISO2S.filter(() => random() > 0.35).map((iso2) => {
		const tail = random() > 0.9 ? 6 + random() * 9 : random() * 2;
		return { raw: iso2, value: Math.round(tail * 100) / 100 };
	});
	return [
		...rows,
		...MESSY_ROWS.map((row) => ({ ...row, value: row.value * 1.5 })),
	];
}

function requests(): FixtureRow[] {
	const random = seededRandom(11);
	const heavy: Record<string, number> = {
		US: 4_800_000,
		IN: 1_200_000,
		DE: 640_000,
		GB: 520_000,
		BR: 410_000,
	};
	const rows = ISO2S.filter((iso2) => iso2 in heavy || random() > 0.25).map(
		(iso2) => ({
			raw: iso2,
			value: heavy[iso2] ?? Math.round(Math.pow(random(), 3) * 180_000),
		}),
	);
	return [
		...rows,
		...MESSY_ROWS.map((row) => ({ ...row, value: row.value * 1000 })),
	];
}

/** Error rate sized by traffic: the same countries' rates and request counts. */
function errorRateAndRequests(): FixtureRow[] {
	const requestsByRaw = new Map(requests().map((row) => [row.raw, row.value]));
	return errorRate().map((row) => ({
		...row,
		size: requestsByRaw.get(row.raw) ?? null,
	}));
}

function europeLatency(): FixtureRow[] {
	const random = seededRandom(23);
	const europe = COUNTRIES.filter((country) =>
		country.properties.regions.includes('europe'),
	)
		.map((country) => country.properties.code)
		.filter((iso2): iso2 is string => Boolean(iso2));
	const rows = europe.map((iso2) => ({
		raw: iso2,
		value: Math.round(80 + random() * 420),
	}));
	return [
		...rows,
		{ raw: 'US', value: 210 },
		{ raw: 'IN', value: 640 },
		{ raw: 'SG', value: 190 },
	];
}

export const FIXTURES: Record<FixtureDataset, Fixture> = {
	errorRate: {
		title: 'Error rate by country',
		unit: 'percent',
		rows: errorRate(),
	},
	errorRateAndRequests: {
		title: 'Error rate by country, sized by requests',
		unit: 'percent',
		rows: errorRateAndRequests(),
		valueLabel: 'Error rate',
		sizeMetric: { label: 'Requests', unit: 'count' },
	},
	cityLatency: {
		title: 'p95 latency by city',
		unit: 'ms',
		rows: [],
		points: cityLatency(),
	},
	manyPoints: {
		title: 'Requests by location (5,000 points)',
		unit: 'count',
		rows: [],
		points: manyPoints(5_000),
	},
	maxPoints: {
		title: 'Requests by location (100,000 points)',
		unit: 'count',
		rows: [],
		points: manyPoints(),
	},
	cityLatencyAndRequests: {
		title: 'p95 latency by city, sized by requests',
		unit: 'ms',
		rows: [],
		points: cityLatency(),
		valueLabel: 'p95 latency',
		sizeMetric: { label: 'Requests', unit: 'count' },
	},
	requests: { title: 'Requests by country', unit: 'count', rows: requests() },
	europeLatency: {
		title: 'p95 latency by country (EU rollout)',
		unit: 'ms',
		rows: europeLatency(),
	},
	usStates: {
		title: 'Requests by US state',
		unit: 'count',
		rows: usRequests(),
		country: 'US',
	},
	indiaStates: {
		title: 'p95 latency by Indian state',
		unit: 'ms',
		rows: indiaLatency(),
		country: 'IN',
	},
};
