import { Typography } from '@signozhq/ui/typography';
import YAxisUnitSelector from 'components/YAxisUnitSelector';
import { YAxisSource } from 'components/YAxisUnitSelector/types';

import {
	isThresholdUnitIncompatible,
	thresholdUnitCategories,
} from '../../thresholdUnitCategories';

import styles from '../../ThresholdsSection.module.scss';

interface ThresholdUnitFieldProps {
	testId: string;
	invalidTestId: string;
	value: string | undefined;
	/** Unit whose category scopes the picker (panel y-axis unit, or the column's unit). */
	scopeUnit: string | undefined;
	/** How the scope reads in the mismatch message, e.g. "y-axis unit" / "column unit". */
	scopeLabel: string;
	onChange: (unit: string) => void;
}

/**
 * Labelled unit picker, scoped to `scopeUnit`'s category (V1 parity) and flagging a
 * threshold unit that resolves to a different category. Shared by every variant; only
 * the scope source and its wording differ.
 */
function ThresholdUnitField({
	testId,
	invalidTestId,
	value,
	scopeUnit,
	scopeLabel,
	onChange,
}: ThresholdUnitFieldProps): JSX.Element {
	return (
		<div className={styles.field}>
			<Typography.Text className={styles.fieldLabel}>Unit</Typography.Text>
			<YAxisUnitSelector
				containerClassName={styles.unitSelector}
				data-testid={testId}
				placeholder="Select unit"
				source={YAxisSource.DASHBOARDS}
				categoriesOverride={thresholdUnitCategories(scopeUnit)}
				value={value}
				onChange={onChange}
			/>
			{isThresholdUnitIncompatible(value, scopeUnit) && (
				<Typography.Text className={styles.invalidUnit} data-testid={invalidTestId}>
					Threshold unit ({value}) is not valid with the {scopeLabel} ({scopeUnit})
				</Typography.Text>
			)}
		</div>
	);
}

export default ThresholdUnitField;
