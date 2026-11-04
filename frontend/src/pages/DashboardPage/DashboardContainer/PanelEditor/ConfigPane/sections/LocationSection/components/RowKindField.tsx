import { useMemo } from 'react';
import { Button } from '@signozhq/ui/button';

import ConfigField from '../../../controls/ConfigField/ConfigField';
import ConfigTiles from '../../../controls/ConfigTiles/ConfigTiles';
import LabelWithInfo from '../../DimensionsSection/LabelWithInfo';
import { LOCATION_DRAWINGS } from '../utils/drawings';
import { RowKind } from '../types';

const KINDS: { value: RowKind; label: string }[] = [
	{ value: RowKind.Country, label: 'Country' },
	{ value: RowKind.State, label: 'State' },
	{ value: RowKind.Point, label: 'Lat / long point' },
];

interface RowKindFieldProps {
	kind: RowKind | undefined;
	isAuto: boolean;
	help: string;
	onPick: (kind: RowKind | 'auto') => void;
}

/** What each row is; in auto mode the detected kind carries an AUTO badge. */
function RowKindField({
	kind,
	isAuto,
	help,
	onPick,
}: RowKindFieldProps): JSX.Element {
	const items = useMemo(
		() =>
			KINDS.map((item) => ({
				...item,
				drawing: LOCATION_DRAWINGS[item.value],
				badge: isAuto && kind === item.value ? 'AUTO' : undefined,
			})),
		[isAuto, kind],
	);

	return (
		<ConfigField
			label={
				<LabelWithInfo
					label="Each row is a"
					info="Each row of the query result becomes one place on the map. Auto picks the type from your group-by column names."
					testId="panel-editor-v2-geo-location-kind-info"
				/>
			}
			aside={
				!isAuto && (
					<Button
						variant="link"
						color="primary"
						size="sm"
						testId="panel-editor-v2-geo-location-auto"
						onClick={(): void => onPick('auto')}
					>
						Back to auto
					</Button>
				)
			}
			help={help}
		>
			<ConfigTiles<RowKind>
				testId="panel-editor-v2-geo-location-kind"
				aria-label="Each row is a"
				value={kind}
				items={items}
				onChange={onPick}
			/>
		</ConfigField>
	);
}

export default RowKindField;
