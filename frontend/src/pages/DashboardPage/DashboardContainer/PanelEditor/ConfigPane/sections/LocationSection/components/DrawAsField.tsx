import { DashboardtypesGeoMapLayerDTO } from 'api/generated/services/sigNoz.schemas';

import ConfigField from '../../../controls/ConfigField/ConfigField';
import ConfigTiles from '../../../controls/ConfigTiles/ConfigTiles';
import type { RowKind } from '../types';
import { describeLayer } from '../utils/descriptions';
import { LOCATION_DRAWINGS } from '../utils/drawings';

const LAYER = DashboardtypesGeoMapLayerDTO;

interface DrawAsFieldProps {
	kind: RowKind | undefined;
	value: DashboardtypesGeoMapLayerDTO;
	onChange: (layer: DashboardtypesGeoMapLayerDTO) => void;
}

/** How country or state rows draw; point rows draw only as points. */
function DrawAsField({ kind, value, onChange }: DrawAsFieldProps): JSX.Element {
	return (
		<ConfigField
			label="Draw as"
			changed={value !== LAYER.regions}
			onReset={(): void => onChange(LAYER.regions)}
			help={describeLayer(kind, value)}
		>
			<ConfigTiles<DashboardtypesGeoMapLayerDTO>
				testId="panel-editor-v2-geo-map-layer"
				aria-label="Draw as"
				value={value}
				items={[
					{
						value: LAYER.regions,
						label: 'Shaded areas',
						drawing: LOCATION_DRAWINGS.regions,
					},
					{
						value: LAYER.bubbles,
						label: 'Bubbles',
						drawing: LOCATION_DRAWINGS.bubbles,
					},
				]}
				onChange={onChange}
			/>
		</ConfigField>
	);
}

export default DrawAsField;
