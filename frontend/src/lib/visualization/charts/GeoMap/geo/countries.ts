import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

import countriesTopology from '../assets/countries-50m.json';
import { CountryFeature, CountryProperties } from '../types';

const topology = countriesTopology as unknown as Topology<{
	countries: GeometryCollection<CountryProperties>;
}>;

export const COUNTRIES = feature(topology, topology.objects.countries)
	.features as CountryFeature[];

export const COUNTRY_BY_ISO2 = new Map(
	COUNTRIES.filter((country) => country.properties.code).map((country) => [
		country.properties.code as string,
		country,
	]),
);

const DISPLAY_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });

export function getCountryName(iso2: string): string {
	try {
		return DISPLAY_NAMES.of(iso2) ?? iso2;
	} catch {
		return iso2;
	}
}
