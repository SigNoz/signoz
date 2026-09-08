import { InputNumber } from '@signozhq/ui/input-number';
import { Typography } from '@signozhq/ui/typography';
import type { DashboardtypesHeatmapColorsDTO } from 'api/generated/services/sigNoz.schemas';

import styles from './HeatmapColorsField.module.scss';

/** `null` on either bound derives it from the data. */
type CountBound = Pick<DashboardtypesHeatmapColorsDTO, 'minCount' | 'maxCount'>;

interface HeatmapCountRangeFieldProps {
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
}: HeatmapCountRangeFieldProps): JSX.Element {
	return (
		<div className={styles.field}>
			<div className={styles.bounds}>
				<div className={styles.field}>
					<Typography.Text>Min count</Typography.Text>
					<InputNumber
						testId="panel-editor-v2-heatmap-min-count"
						placeholder="Auto"
						value={value.minCount ?? null}
						onChange={(minCount): void => onChange({ ...value, minCount })}
					/>
				</div>
				<div className={styles.field}>
					<Typography.Text>Max count</Typography.Text>
					<InputNumber
						testId="panel-editor-v2-heatmap-max-count"
						placeholder="Auto"
						value={value.maxCount ?? null}
						onChange={(maxCount): void => onChange({ ...value, maxCount })}
					/>
				</div>
			</div>
			<Typography.Text className={styles.help}>
				The counts the ramp&apos;s ends mean; empty reads them off the data.
			</Typography.Text>
		</div>
	);
}

export default HeatmapCountRangeField;
