import { seededRandom } from './seededRandom';
import { FixtureRow } from './types';

// GeoIP emits the bare region code next to a separate country column.
const US_REGIONS = [
	'AL',
	'AK',
	'AZ',
	'AR',
	'CA',
	'CO',
	'CT',
	'DE',
	'DC',
	'FL',
	'GA',
	'HI',
	'ID',
	'IL',
	'IN',
	'IA',
	'KS',
	'KY',
	'LA',
	'ME',
	'MD',
	'MA',
	'MI',
	'MN',
	'MS',
	'MO',
	'MT',
	'NE',
	'NV',
	'NH',
	'NJ',
	'NM',
	'NY',
	'NC',
	'ND',
	'OH',
	'OK',
	'OR',
	'PA',
	'RI',
	'SC',
	'SD',
	'TN',
	'TX',
	'UT',
	'VT',
	'VA',
	'WA',
	'WV',
	'WI',
	'WY',
];

export function usRequests(): FixtureRow[] {
	const random = seededRandom(31);
	const heavy: Record<string, number> = {
		CA: 820_000,
		TX: 610_000,
		NY: 540_000,
		FL: 400_000,
	};
	const rows: FixtureRow[] = US_REGIONS.map((region) => ({
		country: 'US',
		raw: region,
		value: heavy[region] ?? Math.round(8_000 + Math.pow(random(), 2) * 150_000),
	}));
	return [
		...rows,
		// A full ISO 3166-2 code and a name for a state already listed: duplicates.
		{ country: 'US', raw: 'US-NY', value: 9 },
		{ country: 'US', raw: 'Texas', value: 9 },
		// Rows the US view can't place.
		{ country: 'US', raw: 'ZZ', value: 1_200 },
		{ country: 'US', raw: null, value: 4_000 },
		{ country: 'CA', raw: 'ON', value: 75_000 },
	];
}
