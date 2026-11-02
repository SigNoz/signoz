import type {
	DashboardtypesGeoMapLayerDTO,
	DashboardtypesGeoMapViewDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { GeoMapPlacementSlice } from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

export type RowKind = 'country' | 'state' | 'point';

export type LocationField = 'country' | 'region' | 'lat' | 'lon';

export type AreaLayer = Exclude<DashboardtypesGeoMapLayerDTO, 'points'>;

/** What the rows were before they became points, so they can go back. */
export interface BeforePoints {
	kind: RowKind | 'auto';
	layer: AreaLayer;
}

export interface KindChange {
	next: GeoMapPlacementSlice;
	/** The area to restore when leaving a state view, which takes over the area. */
	previousView?: DashboardtypesGeoMapViewDTO;
}

export interface UnplacedRow {
	value: string;
	why: string;
}

export type PlacementTone = 'ok' | 'warn' | 'error';

export interface PlacementStatus {
	tone: PlacementTone;
	text: string;
}
