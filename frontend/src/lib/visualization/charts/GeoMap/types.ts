import { ReactNode } from 'react';
import {
	ColorRampPalette,
	ColorRampScale,
} from 'lib/visualization/colorRamp/types';

import type { SUBDIVISION_COUNTRY_CODES } from './geo/subdivisionCountries';

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
export type SubdivisionCountry = (typeof SUBDIVISION_COUNTRY_CODES)[number];

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
	/** The second metric, read only when the map has a `sizeMetric`. */
	size?: number | null;
}

/** A second metric drawn as bubble size, from each datum's `size`. */
export interface GeoMapSizeMetric {
	label: string;
	formatValue: (value: number) => string;
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
	/** Names the colour metric in the tooltip when a size metric is shown. */
	valueLabel?: string;
	/**
	 * Sizes bubbles by a second metric. On `regions` they are drawn neutral over
	 * the shaded shapes; on `bubbles` they keep the value's colour.
	 */
	sizeMetric?: GeoMapSizeMetric;
	isDarkMode: boolean;
	/** Hides the tooltip; the caller opens its drilldown menu from this. */
	onSelect?: (selection: GeoMapSelection) => void;
	renderTooltipFooter?: () => ReactNode;
}
