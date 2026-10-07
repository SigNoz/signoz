import type { ReactNode } from 'react';

import ConfigInlineField from '../../controls/ConfigInlineField/ConfigInlineField';
import ConfigRangeInput from '../../controls/ConfigRangeInput/ConfigRangeInput';
import { isRangeInverted } from '../../controls/ConfigRangeInput/utils';
import { RANGE_HELP, RANGE_INVERTED_ERROR } from './options';

export interface AxisBounds {
	softMin?: number | null;
	softMax?: number | null;
}

interface AxisRangeFieldProps {
	/** Prefix for the `-soft-min` / `-soft-max` test ids. */
	testIdPrefix: string;
	value: AxisBounds | undefined;
	onChange: (bounds: AxisBounds) => void;
	help?: ReactNode;
	helpTestId?: string;
}

/** Soft min/max bounds, flagged when min is above max. */
function AxisRangeField({
	testIdPrefix,
	value,
	onChange,
	help = RANGE_HELP,
	helpTestId,
}: AxisRangeFieldProps): JSX.Element {
	return (
		<ConfigInlineField
			label="Range"
			help={help}
			helpTestId={helpTestId}
			error={
				isRangeInverted(value?.softMin, value?.softMax)
					? RANGE_INVERTED_ERROR
					: undefined
			}
		>
			<ConfigRangeInput
				minTestId={`${testIdPrefix}-soft-min`}
				maxTestId={`${testIdPrefix}-soft-max`}
				min={value?.softMin}
				max={value?.softMax}
				onChangeMin={(softMin): void => onChange({ softMin })}
				onChangeMax={(softMax): void => onChange({ softMax })}
			/>
		</ConfigInlineField>
	);
}

export default AxisRangeField;
