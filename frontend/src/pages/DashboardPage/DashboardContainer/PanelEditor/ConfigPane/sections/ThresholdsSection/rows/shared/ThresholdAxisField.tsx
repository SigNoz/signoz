import { Typography } from '@signozhq/ui/typography';
import { DashboardtypesThresholdAxisDTO } from 'api/generated/services/sigNoz.schemas';

import ConfigTiles, {
	type ConfigTileItem,
} from '../../../../controls/ConfigTiles/ConfigTiles';

import styles from '../../ThresholdsSection.module.scss';

const AXIS_TILES: ConfigTileItem<DashboardtypesThresholdAxisDTO>[] = [
	{ value: DashboardtypesThresholdAxisDTO.x, label: 'X axis' },
	{ value: DashboardtypesThresholdAxisDTO.y, label: 'Y axis' },
];

interface ThresholdAxisFieldProps {
	testId: string;
	value: DashboardtypesThresholdAxisDTO;
	onChange: (axis: DashboardtypesThresholdAxisDTO) => void;
}

function ThresholdAxisField({
	testId,
	value,
	onChange,
}: ThresholdAxisFieldProps): JSX.Element {
	return (
		<div className={styles.field}>
			<Typography.Text className={styles.fieldLabel}>Axis</Typography.Text>
			<ConfigTiles
				compact
				testId={testId}
				aria-label="Axis"
				value={value}
				items={AXIS_TILES}
				onChange={onChange}
			/>
		</div>
	);
}

export default ThresholdAxisField;
