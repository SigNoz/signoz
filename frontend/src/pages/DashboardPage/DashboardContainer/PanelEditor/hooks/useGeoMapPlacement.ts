import { useMemo } from 'react';
import type {
	DashboardtypesGeoMapPanelSpecDTO,
	DashboardtypesPanelDTO,
} from 'api/generated/services/sigNoz.schemas';
import { isSubdivisionCountry } from 'lib/visualization/charts/GeoMap/geo/subdivisions';
import { resolveColorScale } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/GeoMapPanel/utils/chartOptions';
import { useLoadedSubdivisions } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/GeoMapPanel/hooks/useLoadedSubdivisions';
import { prepareGeoMapData } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/GeoMapPanel/utils/prepareData';
import { suggestCountry } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/GeoMapPanel/utils/suggestCountry';
import type { GeoMapPlacement } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/GeoMapPanel/types';
import { getJoinedScalarTable } from 'pages/DashboardPage/DashboardContainer/Panels/utils/getJoinedScalarTable';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

/** A geo map's rows as its preview places them; undefined for other kinds. */
export function useGeoMapPlacement(
	panel: DashboardtypesPanelDTO,
	data: PanelQueryData,
): GeoMapPlacement | undefined {
	const spec =
		panel.spec.plugin.kind === 'signoz/GeoMapPanel'
			? (panel.spec.plugin.spec as DashboardtypesGeoMapPanelSpecDTO)
			: undefined;
	const viewCountry = spec?.map?.viewCountry;
	const subdivisions = useLoadedSubdivisions(
		spec?.map?.view === 'country' && isSubdivisionCountry(viewCountry)
			? viewCountry
			: undefined,
	);

	return useMemo(() => {
		if (!spec) {
			return undefined;
		}
		const table = getJoinedScalarTable(data);
		return {
			data: prepareGeoMapData({
				table,
				location: spec.location,
				map: spec.map,
				scale: resolveColorScale(spec.chartAppearance?.colors),
				subdivisions,
			}),
			suggestedCountry: suggestCountry(table, spec.location),
		};
	}, [spec, data, subdivisions]);
}
