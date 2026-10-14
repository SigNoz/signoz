import {
	ColorRampPalette,
	ColorRampScale,
} from 'lib/visualization/colorRamp/types';

export type LonLatBox = [[number, number], [number, number]];

export interface ShapeProperties {
	/**
	 * ISO 3166-1 alpha-2 for a country (`DE`), ISO 3166-2 for a state or
	 * province (`US-CA`). `null` for the few countries without one (Somaliland,
	 * N. Cyprus, Siachen).
	 */
	code: string | null;
	name: string;
	/** `[lon, lat]` bubble anchor. */
	label: [number, number];
}

export interface CountryProperties extends ShapeProperties {
	iso3: string | null;
	/** Bounds of the largest polygon; Fit to data ignores overseas parts. */
	mainland: LonLatBox;
	bounds: LonLatBox;
	regions: GeoMapView[];
}

export type ShapeFeature = GeoJSON.Feature<
	GeoJSON.Polygon | GeoJSON.MultiPolygon,
	ShapeProperties
>;

export type CountryFeature = GeoJSON.Feature<
	GeoJSON.MultiPolygon,
	CountryProperties
>;

/** Countries whose states/provinces ship with the chart (see `geo/subdivisions.ts`). */
export type SubdivisionCountry = 'US' | 'IN';

export type GeoMapView =
	| 'world'
	| 'fit'
	| 'africa'
	| 'asia'
	| 'europe'
	| 'north_america'
	| 'south_america'
	| 'oceania'
	| 'country';

export type GeoMapLayer = 'regions' | 'bubbles';

export interface GeoMapViewPreset {
	label: string;
	box: LonLatBox;
}

export interface GeoMapDatum {
	/** The shape it colours: a country (`DE`) or a state/province (`US-CA`). */
	code: string;
	value: number;
	/** Group-by value as the query returned it; drilldown filters on this. */
	raw: string;
}

export interface GeoMapColors {
	palette: ColorRampPalette;
	scale: ColorRampScale;
	steps: number;
	min: number | null;
	max: number | null;
}

export interface GeoMapSelection {
	datum: GeoMapDatum;
	clientX: number;
	clientY: number;
}

export interface GeoMapProps {
	data: GeoMapDatum[];
	view: GeoMapView;
	/** Whose states the `country` view draws. */
	country?: SubdivisionCountry;
	layer: GeoMapLayer;
	colors: GeoMapColors;
	bubbleRadius: [number, number];
	formatValue: (value: number) => string;
	isDarkMode: boolean;
	onSelect?: (selection: GeoMapSelection) => void;
}
