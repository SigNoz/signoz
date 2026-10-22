import { Typography } from '@signozhq/ui/typography';
import { DashboardtypesThresholdFormatDTO } from 'api/generated/services/sigNoz.schemas';

import ConfigTiles, {
	type ConfigTileItem,
} from '../../../../controls/ConfigTiles/ConfigTiles';
import { FORMAT_LABEL } from '../../thresholdOptions';

import styles from '../../ThresholdsSection.module.scss';

const PREVIEW_VALUE = '512';

interface ThresholdFormatFieldProps {
	testId: string;
	value: DashboardtypesThresholdFormatDTO | undefined;
	color: string;
	onChange: (format: DashboardtypesThresholdFormatDTO) => void;
}

function ThresholdFormatField({
	testId,
	value,
	color,
	onChange,
}: ThresholdFormatFieldProps): JSX.Element {
	const items: ConfigTileItem<DashboardtypesThresholdFormatDTO>[] = [
		{
			value: DashboardtypesThresholdFormatDTO.background,
			label: FORMAT_LABEL.background,
			drawing: (
				<span className={styles.formatPreview} style={{ backgroundColor: color }}>
					{PREVIEW_VALUE}
				</span>
			),
		},
		{
			value: DashboardtypesThresholdFormatDTO.text,
			label: FORMAT_LABEL.text,
			drawing: (
				<span className={styles.formatPreview} style={{ color }}>
					{PREVIEW_VALUE}
				</span>
			),
		},
	];

	return (
		<div className={styles.field}>
			<Typography.Text className={styles.fieldLabel}>
				Apply color to
			</Typography.Text>
			<ConfigTiles
				testId={testId}
				aria-label="Apply color to"
				value={value}
				items={items}
				onChange={onChange}
			/>
		</div>
	);
}

export default ThresholdFormatField;
