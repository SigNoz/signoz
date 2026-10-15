import type {
	DashboardtypesGeoMapLocationDTO,
	DashboardtypesGeoMapSettingsDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { ColorRampScale } from 'lib/visualization/colorRamp/types';
import type { PanelThreshold } from 'pages/DashboardPage/DashboardContainer/Panels/types/threshold';
import type { SubdivisionSet } from 'lib/visualization/charts/GeoMap/geo/subdivisions';
import type {
	GeoMapDatum,
	GeoMapLayer,
	GeoMapPoint,
} from 'lib/visualization/charts/GeoMap/types';
import type {
	PanelTable,
	PanelTableColumn,
} from 'pages/DashboardPage/DashboardContainer/queryV5/types';

export enum LocationKind {
	Country = 'country',
	Subdivision = 'subdivision',
	Coordinates = 'coordinates',
}

export type ResolvedLocation =
	| { kind: LocationKind.Country; country: PanelTableColumn }
	| {
			kind: LocationKind.Subdivision;
			region: PanelTableColumn;
			country?: PanelTableColumn;
	  }
	| {
			kind: LocationKind.Coordinates;
			lat: PanelTableColumn;
			lon: PanelTableColumn;
	  };

/** A spec field naming a column the result doesn't have. */
export interface StaleBinding {
	field: 'country' | 'region' | 'lat' | 'lon' | 'colorBy' | 'sizeBy';
	key: string;
}

export interface PrepareGeoMapDataArgs {
	table: PanelTable | undefined;
	location: DashboardtypesGeoMapLocationDTO | undefined;
	map: DashboardtypesGeoMapSettingsDTO | undefined;
	scale: ColorRampScale;
	/** The view country's states; needed to place subdivision rows. */
	subdivisions: SubdivisionSet | null;
	/** A location matching one takes its color instead of the palette's. */
	thresholds?: PanelThreshold[];
	/** Units keyed by value column; a threshold converts the color value from its unit. */
	columnUnits?: Record<string, string>;
}

export interface UnmappedValue {
	raw: string;
	rows: number;
}

export interface GeoMapPanelData {
	/** null when no group-by column can place a row. */
	location: ResolvedLocation | null;
	/** `points` only for lat/lon data, which can't shade a shape. */
	layer: GeoMapLayer;
	colorColumn: PanelTableColumn | undefined;
	sizeColumn: PanelTableColumn | undefined;
	regions: GeoMapDatum[];
	points: GeoMapPoint[];
	/** Datum code or point id → row index, for drilldown. */
	rowIndexById: Map<string, number>;
	totalRows: number;
	/** Location values that match no shape, in first-seen order; `''` is a row with none. */
	unmapped: UnmappedValue[];
	unmappedRows: number;
	/** Subdivision rows from a country other than the view's. */
	otherCountryRows: number;
	duplicateRows: number;
	missingValueRows: number;
	/** Drawn rows at or below 0 on a log scale; they sit at its bottom. */
	nonPositiveOnLogRows: number;
	/** Drawn locations matching more than one threshold; the first listed wins. */
	thresholdConflictRows: number;
	/** The result reached the row limit, so more locations may exist. */
	atRowLimit: boolean;
	staleBindings: StaleBinding[];
	/** Subdivision rows wait for the states file, which only a country view loads. */
	needsCountryView: boolean;
	/** Lat/lon columns are needed for the points layer. */
	pointsWithoutCoordinates: boolean;
}

/** What the editor shows about placement: the prepared rows and the country they suggest. */
export interface GeoMapPlacement {
	data: GeoMapPanelData;
	/** The country most rows belong to, from codes like `US-CA` or a country column. */
	suggestedCountry?: string;
}
