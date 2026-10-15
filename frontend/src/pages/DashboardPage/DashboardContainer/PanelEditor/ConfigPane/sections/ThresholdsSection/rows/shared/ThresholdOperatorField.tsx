import { Typography } from '@signozhq/ui/typography';
import { DashboardtypesComparisonOperatorDTO } from 'api/generated/services/sigNoz.schemas';

import ConfigTiles from '../../../../controls/ConfigTiles/ConfigTiles';
import { OPERATOR_PHRASE, OPERATOR_TILES } from '../../thresholdOptions';

import styles from '../../ThresholdsSection.module.scss';

interface ThresholdOperatorFieldProps {
	testId: string;
	value: DashboardtypesComparisonOperatorDTO | undefined;
	onChange: (operator: DashboardtypesComparisonOperatorDTO) => void;
}

function ThresholdOperatorField({
	testId,
	value,
	onChange,
}: ThresholdOperatorFieldProps): JSX.Element {
	return (
		<div className={styles.field}>
			<Typography.Text className={styles.fieldLabel}>
				When the value is{' '}
				{value && (
					<strong className={styles.emphasis}>{OPERATOR_PHRASE[value]}</strong>
				)}
			</Typography.Text>
			<ConfigTiles
				compact
				testId={testId}
				aria-label="Condition"
				value={value}
				items={OPERATOR_TILES}
				onChange={onChange}
			/>
		</div>
	);
}

export default ThresholdOperatorField;
