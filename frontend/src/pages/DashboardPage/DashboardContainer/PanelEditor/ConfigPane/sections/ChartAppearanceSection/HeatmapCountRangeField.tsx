import { Callout } from '@signozhq/ui/callout';
import type { DashboardtypesHeatmapColorsDTO } from 'api/generated/services/sigNoz.schemas';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigRangeInput from '../../controls/ConfigRangeInput/ConfigRangeInput';
import { isRangeInverted } from '../../controls/ConfigRangeInput/utils';
import type { FieldResetProps } from '../../utils/changes';

/** `null` on either bound derives it from the data. */
type CountBound = Pick<DashboardtypesHeatmapColorsDTO, 'minCount' | 'maxCount'>;

interface HeatmapCountRangeFieldProps extends Partial<FieldResetProps> {
	value: CountBound;
	onChange: (next: CountBound) => void;
}

/**
 * Clamps the colour scale to a fixed count range. Two panels rarely derive the
 * same bounds, so comparing them needs the range pinned on both.
 */
function HeatmapCountRangeField({
	value,
	onChange,
	changed,
	onReset,
}: HeatmapCountRangeFieldProps): JSX.Element {
	const { minCount, maxCount } = value;

	return (
		<ConfigField
			label="Count range"
			changed={changed}
			onReset={onReset}
			help={
				isRangeInverted(minCount, maxCount) ? (
					<Callout type="error" size="small" showIcon>
						Min count can&apos;t be greater than max count.
					</Callout>
				) : (
					'Leave empty to read the range from the data.'
				)
			}
		>
			<ConfigRangeInput
				minTestId="panel-editor-v2-heatmap-min-count"
				maxTestId="panel-editor-v2-heatmap-max-count"
				min={minCount}
				max={maxCount}
				onChangeMin={(next): void => onChange({ ...value, minCount: next })}
				onChangeMax={(next): void => onChange({ ...value, maxCount: next })}
			/>
		</ConfigField>
	);
}

export default HeatmapCountRangeField;
