import { ReactNode } from 'react';
import type { LegendPosition } from 'lib/uPlotV2/components/types';
import {
	ColorRampMode,
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

export type GeoMapLayer = 'regions' | 'bubbles' | 'points';

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
	/** Drawn in place of the palette colour, e.g. a matched threshold's. */
	color?: string;
}

/** One row placed by latitude and longitude, drawn on the `points` layer. */
export interface GeoMapPoint {
	/** Unique within the map; hover and selection key on it. */
	id: string;
	lat: number;
	lon: number;
	value: number;
	/** The second metric, read only when the map has a `sizeMetric`. */
	size?: number | null;
	/** What the tooltip names it by: the group value(s), e.g. a city. */
	label: string;
	/** Drawn in place of the palette colour, e.g. a matched threshold's. */
	color?: string;
}

/** A legend key for colours drawn outside the palette, e.g. a threshold. */
export interface GeoMapColorKey {
	label: string;
	color: string;
}

/** A second metric drawn as bubble size, from each datum's `size`. */
export interface GeoMapSizeMetric {
	label: string;
	formatValue: (value: number) => string;
}

export interface GeoMapColors {
	/** Palette walks a multi-colour ramp; opacity fades `fill` from clear to solid. */
	mode: ColorRampMode;
	palette: ColorRampPalette;
	scale: ColorRampScale;
	steps: number;
	min: number | null;
	max: number | null;
	/** Opacity mode's colour; empty uses the default fill. */
	fill: string;
}

export interface GeoMapSelection {
	datum: GeoMapDatum;
	/** Set on the `points` layer: the point clicked. */
	point?: GeoMapPoint;
	clientX: number;
	clientY: number;
}

export interface GeoMapProps {
	data: GeoMapDatum[];
	/** Rows placed by lat/lon; drawn when `layer` is `points`. */
	points?: GeoMapPoint[];
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
	/** Shape names, each shown once it fits inside its shape. Defaults to on. */
	showLabels?: boolean;
	/** Keys for the data's own `color`s, listed after the colour bar. */
	colorKeys?: GeoMapColorKey[];
	/** Below the map (default), or in a column to its right. */
	legendPosition?: LegendPosition;
	isDarkMode: boolean;
	/** Hides the tooltip; the caller opens its drilldown menu from this. */
	onSelect?: (selection: GeoMapSelection) => void;
	renderTooltipFooter?: () => ReactNode;
}
