import type { ChangeEvent } from 'react';
import { Typography } from '@signozhq/ui/typography';
import { Input } from 'antd';
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
	// An empty field derives the bound (null), as does transient non-numeric input
	// (a lone "-"), which pinning would read as a bound the user never typed.
	const handleBound =
		(bound: keyof CountBound) =>
		(event: ChangeEvent<HTMLInputElement>): void => {
			const raw = event.target.value;
			const next = raw === '' || Number.isNaN(Number(raw)) ? null : Number(raw);
			onChange({ ...value, [bound]: next });
		};

	return (
		<div className={styles.field}>
			<div className={styles.bounds}>
				<div className={styles.field}>
					<Typography.Text>Min count</Typography.Text>
					<Input
						data-testid="panel-editor-v2-heatmap-min-count"
						type="number"
						placeholder="Auto"
						value={value.minCount ?? ''}
						onChange={handleBound('minCount')}
					/>
				</div>
				<div className={styles.field}>
					<Typography.Text>Max count</Typography.Text>
					<Input
						data-testid="panel-editor-v2-heatmap-max-count"
						type="number"
						placeholder="Auto"
						value={value.maxCount ?? ''}
						onChange={handleBound('maxCount')}
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
