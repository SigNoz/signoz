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
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="secondary"
				as="span"
				textOverflow="wrap"
			>
				When the value is{' '}
				{value && (
					<strong className={styles.emphasis}>{OPERATOR_PHRASE[value]}</strong>
				)}
			</Typography>
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
