import type { GeoMapPlacementSlice } from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import LocationColumnField from './LocationColumnField';
import type { LocationField, RowKind } from '../types';

interface LocationColumnsProps {
	kind: RowKind;
	location: GeoMapPlacementSlice['location'];
	groupColumns: string[];
	autoColumn: (field: LocationField) => string | undefined;
	onChange: (patch: Partial<Record<LocationField, string>>) => void;
}

type ColumnField = { field: LocationField; label: string; noun: string };

const FIELDS: Record<RowKind, ColumnField[]> = {
	country: [{ field: 'country', label: 'Country column', noun: 'country' }],
	state: [{ field: 'region', label: 'State column', noun: 'state' }],
	point: [
		{ field: 'lat', label: 'Latitude', noun: 'latitude' },
		{ field: 'lon', label: 'Longitude', noun: 'longitude' },
	],
};

/** The column (or lat/lon pair) each row is read from. */
function LocationColumns({
	kind,
	location,
	groupColumns,
	autoColumn,
	onChange,
}: LocationColumnsProps): JSX.Element {
	return (
		<>
			{FIELDS[kind].map(({ field, label, noun }) => (
				<LocationColumnField
					key={field}
					testId={`panel-editor-v2-geo-location-${field}`}
					label={label}
					noun={noun}
					value={location?.[field]}
					autoColumn={autoColumn(field)}
					groupColumns={groupColumns}
					onChange={(column): void => onChange({ [field]: column })}
				/>
			))}
		</>
	);
}

export default LocationColumns;
