import { CountryFeature, GeoMapView, ShapeFeature } from '../types';
import { COUNTRIES, getCountryName } from './countries';
import { SubdivisionSet } from './subdivisions';
import { isMember as isCountryMember } from './views';

/** What a view draws, and which of those shapes carry data and take input. */
export interface GeoMapShapes {
	shapes: ShapeFeature[];
	isMember: (shape: ShapeFeature) => boolean;
	byCode: Map<string, ShapeFeature>;
	nameOf: (code: string) => string;
}

const byCodeOf = (shapes: ShapeFeature[]): Map<string, ShapeFeature> =>
	new Map(
		shapes
			.filter((shape) => shape.properties.code)
			.map((shape) => [shape.properties.code as string, shape]),
	);

export function getCountryShapes(view: GeoMapView): GeoMapShapes {
	return {
		shapes: COUNTRIES,
		isMember: (shape): boolean => isCountryMember(shape as CountryFeature, view),
		byCode: byCodeOf(COUNTRIES),
		nameOf: getCountryName,
	};
}

/** The country's states as members; every other country as faint context. */
export function getSubdivisionShapes(set: SubdivisionSet): GeoMapShapes {
	const neighbours = COUNTRIES.filter(
		(country) => country.properties.code !== set.country,
	);
	const byCode = byCodeOf(set.shapes);
	return {
		shapes: [...neighbours, ...set.shapes],
		isMember: (shape): boolean =>
			shape.properties.code !== null && set.codes.has(shape.properties.code),
		byCode,
		nameOf: (code): string => byCode.get(code)?.properties.name ?? code,
	};
}
