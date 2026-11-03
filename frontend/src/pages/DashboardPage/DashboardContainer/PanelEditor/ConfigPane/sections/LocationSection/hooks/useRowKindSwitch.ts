import { useRef } from 'react';
import {
	DashboardtypesGeoMapLayerDTO,
	type DashboardtypesGeoMapViewDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { GeoMapPlacementSlice } from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import {
	type AreaLayer,
	type BeforePoints,
	type LocationField,
	RowKind,
} from '../types';
import { changeRowKind, drawableKind, patchMap } from '../utils/rowKind';

interface UseRowKindSwitchArgs {
	value: GeoMapPlacementSlice | undefined;
	onChange: (next: GeoMapPlacementSlice) => void;
	kind: RowKind | undefined;
	isAuto: boolean;
	layer: DashboardtypesGeoMapLayerDTO;
	detected: Partial<Record<LocationField, string>>;
	suggestedCountry: string | undefined;
}

interface UseRowKindSwitchApi {
	pickKind: (to: RowKind | 'auto') => void;
	/** The country or state column point rows can go back to, if any. */
	areaColumn: string | undefined;
	/** Leaves point rows for the kind and layer drawn before them. */
	restoreAreas: () => void;
}

/**
 * Switches what a row is, remembering the area a state view replaced and the
 * kind and layer point rows replaced, so switching back restores them.
 */
export function useRowKindSwitch({
	value,
	onChange,
	kind,
	isAuto,
	layer,
	detected,
	suggestedCountry,
}: UseRowKindSwitchArgs): UseRowKindSwitchApi {
	const previousView = useRef<DashboardtypesGeoMapViewDTO>();
	const beforePoints = useRef<BeforePoints>();

	const switchKind = (to: RowKind | 'auto', areaLayer?: AreaLayer): void => {
		if (to === RowKind.Point && kind && kind !== RowKind.Point) {
			beforePoints.current = {
				kind: isAuto ? 'auto' : kind,
				layer: layer as AreaLayer,
			};
		}
		const change = changeRowKind(value, kind, to, {
			previousView: previousView.current,
			suggestedCountry,
		});
		if (change.previousView) {
			previousView.current = change.previousView;
		}
		onChange(
			areaLayer
				? { ...change.next, map: patchMap(change.next.map, { layer: areaLayer }) }
				: change.next,
		);
	};

	const areaKind =
		beforePoints.current?.kind ?? drawableKind(detected, RowKind.Point);

	return {
		pickKind: (to): void => switchKind(to),
		areaColumn:
			areaKind === RowKind.State
				? detected.region
				: areaKind && (detected.country ?? detected.region),
		restoreAreas: (): void =>
			switchKind(
				areaKind ?? RowKind.Country,
				beforePoints.current?.layer ?? DashboardtypesGeoMapLayerDTO.regions,
			),
	};
}
