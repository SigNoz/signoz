// Inputs and tuning for the Geo Map outlines build. Tables only; no logic.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NATURAL_EARTH_BASE =
	'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson';
export const COUNTRIES_URL = `${NATURAL_EARTH_BASE}/ne_50m_admin_0_countries.geojson`;
export const SUBDIVISIONS_URL = `${NATURAL_EARTH_BASE}/ne_10m_admin_1_states_provinces.geojson`;

const GEO_MAP_DIR = join(
	dirname(fileURLToPath(import.meta.url)),
	'../../src/lib/visualization/charts/GeoMap',
);
export const ASSETS_DIR = join(GEO_MAP_DIR, 'assets');
export const SUBDIVISION_LIST_FILE = join(
	GEO_MAP_DIR,
	'geo/subdivisionCountries.ts',
);

export const COUNTRY_QUANTIZATION = 1e5;
// Simplification drops every point whose triangle with its neighbours is
// smaller than this, in square degrees. A fixed size, unlike a share of all
// points, still leaves a small island a few points of its own.
export const COUNTRY_MIN_WEIGHT = 3e-3;
// 10m is street-level detail; a country view needs far less.
export const SUBDIVISION_QUANTIZATION = 1e4;
export const SUBDIVISION_MIN_WEIGHT = 1e-3;
// A shape this many times the minimum weight or smaller could lose every polygon.
export const PROTECTED_SHAPE_FACTOR = 10;

// A country view needs at least this many coded states to be worth drawing.
export const MIN_SUBDIVISIONS = 2;

// ISO 3166-2 codes that changed after Natural Earth v5.1.2, or older spellings
// still in GeoIP data, mapped to the code the shape carries.
export const SUBDIVISION_ALIASES = {
	IN: {
		'IN-CG': 'IN-CT',
		'IN-UK': 'IN-UT',
		'IN-TS': 'IN-TG',
		'IN-OD': 'IN-OR',
		'IN-DD': 'IN-DH',
		'IN-DN': 'IN-DH',
	},
	// Natural Earth carries Metro Manila under its retired code.
	PH: { 'PH-00': 'PH-MNL' },
};

// Shapes Natural Earth still splits along retired lines, merged into the codes
// GeoIP reports now; the retired codes become aliases. Northern Ireland's 26
// districts became 11 councils in 2015, each a union of old districts.
// Current code → [current name, retired codes].
export const SUBDIVISION_MERGES = {
	GB: {
		'GB-ANN': ['Antrim and Newtownabbey', ['GB-ANT', 'GB-NTA']],
		'GB-AND': ['Ards and North Down', ['GB-ARD', 'GB-NDN']],
		'GB-ABC': [
			'Armagh City, Banbridge and Craigavon',
			['GB-ARM', 'GB-BNB', 'GB-CGV'],
		],
		'GB-BFS': ['Belfast', ['GB-BFS']],
		'GB-CCG': [
			'Causeway Coast and Glens',
			['GB-BLY', 'GB-CLR', 'GB-LMV', 'GB-MYL'],
		],
		'GB-DRS': ['Derry City and Strabane', ['GB-DRY', 'GB-STB']],
		'GB-FMO': ['Fermanagh and Omagh', ['GB-FER', 'GB-OMH']],
		'GB-LBC': ['Lisburn and Castlereagh', ['GB-LSB', 'GB-CSR']],
		'GB-MEA': ['Mid and East Antrim', ['GB-BLA', 'GB-CKF', 'GB-LRN']],
		'GB-MUL': ['Mid Ulster', ['GB-CKT', 'GB-DGN', 'GB-MFT']],
		'GB-NMD': ['Newry, Mourne and Down', ['GB-NYM', 'GB-DOW']],
	},
};

// Natural Earth puts these islands in "Seven seas (open ocean)".
export const OPEN_OCEAN_REGION = {
	Africa: 'africa',
	Asia: 'asia',
	Americas: 'south_america',
};
export const CONTINENT_REGION = {
	Africa: 'africa',
	Asia: 'asia',
	Europe: 'europe',
	'North America': 'north_america',
	'South America': 'south_america',
	Oceania: 'oceania',
};
// Transcontinental countries belong to every region they span.
export const EXTRA_REGIONS = {
	RU: ['asia'],
	TR: ['europe'],
	KZ: ['europe'],
	GE: ['europe'],
	AM: ['europe'],
	AZ: ['europe'],
	CY: ['europe'],
	EG: ['asia'],
};

// ISO codes GeoIP emits for places Natural Earth draws inside another country.
export const COUNTRY_ALIASES = {
	GF: 'FR',
	GP: 'FR',
	MQ: 'FR',
	RE: 'FR',
	YT: 'FR',
	BQ: 'NL',
	SJ: 'NO',
	BV: 'NO',
	CX: 'AU',
	CC: 'AU',
	HM: 'AU',
	UM: 'US',
	TK: 'NZ',
	AC: 'SH',
	TA: 'SH',
	DG: 'IO',
	CP: 'FR',
	FX: 'FR',
	EA: 'ES',
	IC: 'ES',
	CQ: 'GB',
	GI: 'GB',
	// Retired or reserved codes still seen in older data.
	UK: 'GB',
	SU: 'RU',
	YU: 'RS',
	CS: 'RS',
	TP: 'TL',
	BU: 'MM',
	ZR: 'CD',
	DD: 'DE',
	VD: 'VN',
	YD: 'YE',
	RH: 'ZW',
	NH: 'VU',
	HV: 'BF',
	DY: 'BJ',
	AN: 'CW',
};
export const COUNTRY_NAME_ALIASES = {
	usa: 'US',
	'united states of america': 'US',
	america: 'US',
	uk: 'GB',
	'great britain': 'GB',
	britain: 'GB',
	england: 'GB',
	russia: 'RU',
	'south korea': 'KR',
	'north korea': 'KP',
	czechia: 'CZ',
	'czech republic': 'CZ',
	'ivory coast': 'CI',
	turkiye: 'TR',
	türkiye: 'TR',
	burma: 'MM',
	'cape verde': 'CV',
	swaziland: 'SZ',
	macedonia: 'MK',
	'east timor': 'TL',
	vatican: 'VA',
};

// Alpha-2 codes Intl names that aren't countries, so none needs a shape.
export const NON_COUNTRY_CODES = new Set([
	'EU',
	'EZ',
	'UN',
	'ZZ',
	'QO',
	'XA',
	'XB',
	'AQ',
]);
