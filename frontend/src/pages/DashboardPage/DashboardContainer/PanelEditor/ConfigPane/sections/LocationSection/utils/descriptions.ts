import { DashboardtypesGeoMapLayerDTO } from 'api/generated/services/sigNoz.schemas';
import {
	type GeoMapPanelData,
	LocationKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/kinds/GeoMapPanel/types';

import { LocationField, RowKind } from '../types';

const LAYER = DashboardtypesGeoMapLayerDTO;

/** The column Auto reads for a field: what the preview placed rows by, else a name match. */
export function autoColumnFor(
	field: LocationField,
	resolved: GeoMapPanelData['location'] | undefined,
	detected: Partial<Record<LocationField, string>>,
): string | undefined {
	if (
		resolved?.kind === LocationKind.Country &&
		field === LocationField.Country
	) {
		return resolved.country.id;
	}
	if (
		resolved?.kind === LocationKind.Subdivision &&
		field === LocationField.Region
	) {
		return resolved.region.id;
	}
	if (
		resolved?.kind === LocationKind.Coordinates &&
		(field === LocationField.Lat || field === LocationField.Lon)
	) {
		return resolved[field].id;
	}
	return detected[field];
}

const KIND_HELP: Record<RowKind, string> = {
	country: 'Each row is shaded on its country.',
	state: 'Each row is one state of the country you pick below.',
	point: 'Each row is drawn at its latitude and longitude.',
};

export function describeKind({
	hasGroupBy,
	kind,
	isAuto,
	autoColumn,
}: {
	hasGroupBy: boolean;
	kind: RowKind | undefined;
	isAuto: boolean;
	autoColumn: (field: LocationField) => string | undefined;
}): string {
	if (!hasGroupBy) {
		return 'Nothing to detect yet.';
	}
	if (!kind) {
		return 'No group-by column looks like a location. Pick a type to choose the column yourself.';
	}
	if (!isAuto) {
		return KIND_HELP[kind];
	}
	const from =
		kind === RowKind.Point
			? `${autoColumn(LocationField.Lat)} and ${autoColumn(LocationField.Lon)}`
			: autoColumn(
					kind === RowKind.State ? LocationField.Region : LocationField.Country,
				);
	return `Auto-detected from ${from}.`;
}

export function describeLayer(
	kind: RowKind | undefined,
	layer: DashboardtypesGeoMapLayerDTO,
): string {
	const shape = kind === RowKind.State ? 'state' : 'country';
	return layer === LAYER.regions
		? `Fills each ${shape} with its color.`
		: `Draws a circle at the center of each ${shape}.`;
}

export function describeSize({
	layer,
	sizeBy,
	colorLabel,
	sizeLabel,
}: {
	layer: DashboardtypesGeoMapLayerDTO;
	sizeBy: string | undefined;
	colorLabel: string;
	sizeLabel: string;
}): string {
	if (layer === LAYER.regions) {
		return sizeBy
			? `Adds a circle on each shape. Its area follows ${sizeLabel}.`
			: 'Off. Pick a value to add a circle on each shape.';
	}
	if (sizeBy && sizeLabel !== colorLabel) {
		return `Color shows ${colorLabel}, size shows ${sizeLabel}.`;
	}
	return `Bigger ${layer === LAYER.bubbles ? 'bubbles' : 'points'} mean a higher ${sizeLabel}.`;
}
