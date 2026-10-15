import { Button } from '@signozhq/ui/button';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigTiles from '../../controls/ConfigTiles/ConfigTiles';
import LabelWithInfo from '../DimensionsSection/LabelWithInfo';
import { LOCATION_DRAWINGS } from './drawings';
import type { RowKind } from './utils';

const KINDS: { value: RowKind; label: string }[] = [
	{ value: 'country', label: 'Country' },
	{ value: 'state', label: 'State' },
	{ value: 'point', label: 'Lat / lon point' },
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
						data-testid="panel-editor-v2-geo-location-auto"
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
				items={KINDS.map((item) => ({
					...item,
					drawing: LOCATION_DRAWINGS[item.value],
					badge: isAuto && kind === item.value ? 'AUTO' : undefined,
				}))}
				onChange={onPick}
			/>
		</ConfigField>
	);
}

export default RowKindField;
