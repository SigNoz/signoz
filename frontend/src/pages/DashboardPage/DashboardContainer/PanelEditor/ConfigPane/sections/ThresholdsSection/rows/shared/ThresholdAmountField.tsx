import { useEffect, useState } from 'react';
import { TriangleAlert } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import { Input } from 'antd';
import YAxisUnitSelector from 'components/YAxisUnitSelector';
import { YAxisSource } from 'components/YAxisUnitSelector/types';
import { getUniversalNameFromMetricUnit } from 'components/YAxisUnitSelector/utils';

import {
	isThresholdUnitIncompatible,
	thresholdUnitCategories,
} from '../../thresholdUnitCategories';

import styles from '../../ThresholdsSection.module.scss';

interface ThresholdAmountFieldProps {
	label: string;
	testIdPrefix: string;
	index: number;
	value: number;
	/** Receives the raw input string; the draft hook parses it. */
	onValueChange: (raw: string) => void;
	unit: string | undefined;
	/** Unit whose category scopes the picker (panel y-axis unit, or the column's unit). */
	scopeUnit: string | undefined;
	/** How the scope reads in the mismatch message, e.g. "y-axis unit" / "column unit". */
	scopeLabel: string;
	onUnitChange: (unit: string) => void;
}

/** The unit picker is scoped to `scopeUnit`'s category (V1 parity). */
function ThresholdAmountField({
	label,
	testIdPrefix,
	index,
	value,
	onValueChange,
	unit,
	scopeUnit,
	scopeLabel,
	onUnitChange,
}: ThresholdAmountFieldProps): JSX.Element {
	const [raw, setRaw] = useState(String(value));

	useEffect(() => {
		setRaw((prev) => (Number(prev) === value ? prev : String(value)));
	}, [value]);

	return (
		<div className={styles.field}>
			<Typography.Text className={styles.fieldLabel}>{label}</Typography.Text>
			<div className={styles.amountRow}>
				<Input
					data-testid={`${testIdPrefix}-value-${index}`}
					type="number"
					placeholder="e.g. 500"
					aria-label="Value"
					value={raw}
					onChange={(e): void => {
						setRaw(e.target.value);
						onValueChange(e.target.value);
					}}
				/>
				<YAxisUnitSelector
					containerClassName={styles.unitSelector}
					data-testid={`${testIdPrefix}-unit-${index}`}
					placeholder="Unit"
					source={YAxisSource.DASHBOARDS}
					categoriesOverride={thresholdUnitCategories(scopeUnit)}
					value={unit}
					onChange={onUnitChange}
				/>
			</div>
			{isThresholdUnitIncompatible(unit, scopeUnit) && (
				<div
					className={styles.invalidUnit}
					data-testid={`${testIdPrefix}-unit-invalid-${index}`}
				>
					<TriangleAlert size={13} className={styles.invalidUnitIcon} />
					<Typography.Text className={styles.invalidUnitText}>
						{getUniversalNameFromMetricUnit(unit)} can&apos;t be compared with the{' '}
						{scopeLabel} ({getUniversalNameFromMetricUnit(scopeUnit)}).
					</Typography.Text>
				</div>
			)}
		</div>
	);
}

export default ThresholdAmountField;
