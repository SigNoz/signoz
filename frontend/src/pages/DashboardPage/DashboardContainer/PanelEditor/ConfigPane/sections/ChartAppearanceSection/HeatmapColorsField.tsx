import { Typography } from '@signozhq/ui/typography';
import {
	DashboardtypesHeatmapColorModeDTO,
	DashboardtypesHeatmapColorScaleDTO,
	type DashboardtypesHeatmapColorsDTO,
} from 'api/generated/services/sigNoz.schemas';

import ConfigSegmented from '../../controls/ConfigSegmented/ConfigSegmented';
import HeatmapColorStepsField from './HeatmapColorStepsField';
import HeatmapCountRangeField from './HeatmapCountRangeField';
import HeatmapFillField from './HeatmapFillField';
import HeatmapPaletteGrid from './HeatmapPaletteGrid';
import HeatmapRampPreview from './HeatmapRampPreview';
import { COLOR_MODE_OPTIONS, COLOR_SCALE_OPTIONS } from './heatmapColorOptions';

import styles from './HeatmapColorsField.module.scss';

interface HeatmapColorsFieldProps {
	value: DashboardtypesHeatmapColorsDTO | undefined;
	onChange: (next: DashboardtypesHeatmapColorsDTO) => void;
}

/**
 * Edits `chartAppearance.colors` — how a cell's count becomes a colour. Palette
 * mode ramps through a sequential palette, opacity mode through one fill's alpha;
 * everything below the mode applies to both.
 */
function HeatmapColorsField({
	value,
	onChange,
}: HeatmapColorsFieldProps): JSX.Element {
	const isOpacityMode =
		value?.mode === DashboardtypesHeatmapColorModeDTO.opacity;

	return (
		<div className={styles.colors}>
			<HeatmapRampPreview colors={value} />

			<div className={styles.field}>
				<Typography.Text>Color mode</Typography.Text>
				<ConfigSegmented
					testId="panel-editor-v2-heatmap-color-mode"
					value={value?.mode}
					items={COLOR_MODE_OPTIONS}
					onChange={(next): void =>
						onChange({
							...value,
							mode: next as DashboardtypesHeatmapColorModeDTO,
						})
					}
				/>
			</div>

			{isOpacityMode ? (
				<HeatmapFillField
					value={value?.fill}
					onChange={(fill): void => onChange({ ...value, fill })}
				/>
			) : (
				<div className={styles.field}>
					<Typography.Text>Palette</Typography.Text>
					<HeatmapPaletteGrid
						value={value?.palette}
						onChange={(palette): void => onChange({ ...value, palette })}
					/>
				</div>
			)}

			<div className={styles.field}>
				<Typography.Text>Color scale</Typography.Text>
				<ConfigSegmented
					testId="panel-editor-v2-heatmap-color-scale"
					value={value?.scale}
					items={COLOR_SCALE_OPTIONS}
					onChange={(next): void =>
						onChange({
							...value,
							scale: next as DashboardtypesHeatmapColorScaleDTO,
						})
					}
				/>
				<Typography.Text className={styles.help}>
					How a count maps onto the ramp.
				</Typography.Text>
			</div>

			<HeatmapColorStepsField
				value={value?.steps}
				onChange={(steps): void => onChange({ ...value, steps })}
			/>

			<HeatmapCountRangeField
				value={{ minCount: value?.minCount, maxCount: value?.maxCount }}
				onChange={(bounds): void => onChange({ ...value, ...bounds })}
			/>
		</div>
	);
}

export default HeatmapColorsField;
