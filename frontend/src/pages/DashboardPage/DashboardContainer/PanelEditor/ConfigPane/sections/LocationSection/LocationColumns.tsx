import type { GeoMapPlacementSlice } from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import LocationColumnField from './LocationColumnField';
import type { LocationField, RowKind } from './utils';

import styles from './LocationSection.module.scss';

interface LocationColumnsProps {
	kind: RowKind;
	location: GeoMapPlacementSlice['location'];
	groupColumns: string[];
	autoColumn: (field: LocationField) => string | undefined;
	onChange: (patch: Partial<Record<LocationField, string>>) => void;
}

const SINGLE: Record<
	'country' | 'state',
	{ field: LocationField; label: string; noun: string }
> = {
	country: { field: 'country', label: 'Country column', noun: 'country' },
	state: { field: 'region', label: 'State column', noun: 'state' },
};

/** The column (or lat/lon pair) each row is read from. */
function LocationColumns({
	kind,
	location,
	groupColumns,
	autoColumn,
	onChange,
}: LocationColumnsProps): JSX.Element {
	const field = (
		name: LocationField,
		label: string,
		noun: string,
	): JSX.Element => (
		<LocationColumnField
			key={name}
			testId={`panel-editor-v2-geo-location-${name}`}
			label={label}
			noun={noun}
			value={location?.[name]}
			autoColumn={autoColumn(name)}
			groupColumns={groupColumns}
			onChange={(column): void => onChange({ [name]: column })}
		/>
	);

	if (kind !== 'point') {
		const { field: name, label, noun } = SINGLE[kind];
		return field(name, label, noun);
	}
	const isMissing = (name: LocationField): boolean =>
		!(location?.[name] || autoColumn(name));
	return (
		<>
			{field('lat', 'Latitude', 'latitude')}
			{field('lon', 'Longitude', 'longitude')}
			{(isMissing('lat') || isMissing('lon')) && (
				<span className={styles.warning}>
					Points need both columns; until then nothing is drawn.
				</span>
			)}
		</>
	);
}

export default LocationColumns;
