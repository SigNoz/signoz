import type {
	DashboardtypesGeoMapLayerDTO,
	DashboardtypesGeoMapViewDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { GeoMapPlacementSlice } from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

export enum RowKind {
	Country = 'country',
	State = 'state',
	Point = 'point',
}

export enum LocationField {
	Country = 'country',
	Region = 'region',
	Lat = 'lat',
	Lon = 'lon',
}

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

export enum PlacementTone {
	Ok = 'ok',
	Warn = 'warn',
	Error = 'error',
}

export interface PlacementStatus {
	tone: PlacementTone;
	text: string;
}
