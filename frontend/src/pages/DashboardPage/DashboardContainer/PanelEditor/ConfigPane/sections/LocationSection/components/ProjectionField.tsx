import { DashboardtypesGeoMapProjectionDTO } from 'api/generated/services/sigNoz.schemas';

import ConfigField from '../../../controls/ConfigField/ConfigField';
import ConfigTiles from '../../../controls/ConfigTiles/ConfigTiles';
import { LOCATION_DRAWINGS } from '../utils/drawings';
import { PROJECTION_HELP } from '../utils/options';

const PROJECTION = DashboardtypesGeoMapProjectionDTO;

interface ProjectionFieldProps {
	value: DashboardtypesGeoMapProjectionDTO;
	onChange: (projection: DashboardtypesGeoMapProjectionDTO) => void;
}

function ProjectionField({
	value,
	onChange,
}: ProjectionFieldProps): JSX.Element {
	return (
		<ConfigField
			label="Projection"
			changed={value !== PROJECTION.mercator}
			onReset={(): void => onChange(PROJECTION.mercator)}
			help={PROJECTION_HELP[value]}
		>
			<ConfigTiles<DashboardtypesGeoMapProjectionDTO>
				testId="panel-editor-v2-geo-map-projection"
				aria-label="Projection"
				value={value}
				items={[
					{
						value: PROJECTION.mercator,
						label: 'Mercator',
						description: 'True shapes',
						drawing: LOCATION_DRAWINGS.mercator,
					},
					{
						value: PROJECTION.equal_earth,
						label: 'Equal Earth',
						description: 'True areas',
						drawing: LOCATION_DRAWINGS.equal_earth,
					},
					{
						value: PROJECTION.natural_earth,
						label: 'Natural Earth',
						description: 'Balanced',
						drawing: LOCATION_DRAWINGS.natural_earth,
					},
				]}
				onChange={onChange}
			/>
		</ConfigField>
	);
}

export default ProjectionField;
