import { useMemo } from 'react';
import {
	type DashboardtypesGeoMapSettingsDTO,
	DashboardtypesGeoMapViewDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { GeoMapPlacementSlice } from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigField from '../../../controls/ConfigField/ConfigField';
import ConfigSelect from '../../../controls/ConfigSelect/ConfigSelect';
import { RowKind } from '../types';
import { buildAreaItems, fromAreaValue, toAreaValue } from '../utils/options';

const VIEW = DashboardtypesGeoMapViewDTO;

interface MapAreaFieldProps {
	kind: RowKind | undefined;
	value: GeoMapPlacementSlice | undefined;
	onChange: (
		patch: Pick<DashboardtypesGeoMapSettingsDTO, 'view' | 'viewCountry'>,
	) => void;
}

/** Where the map opens; point rows can also frame one country. */
function MapAreaField({
	kind,
	value,
	onChange,
}: MapAreaFieldProps): JSX.Element {
	const items = useMemo(() => buildAreaItems(kind), [kind]);

	return (
		<ConfigField
			label="Map area"
			changed={toAreaValue(value) !== VIEW.world}
			onReset={(): void => onChange({ view: VIEW.world, viewCountry: '' })}
			help={
				value?.map?.view === VIEW.fit
					? 'Zooms to the places in the results.'
					: undefined
			}
		>
			<ConfigSelect
				testId="panel-editor-v2-geo-map-view"
				showSearch={kind === RowKind.Point}
				value={toAreaValue(value)}
				items={items}
				onChange={(next): void => onChange(fromAreaValue(next))}
			/>
		</ConfigField>
	);
}

export default MapAreaField;
