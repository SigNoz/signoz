import {
	DashboardtypesHeatmapColorModeDTO,
	type DashboardtypesHeatmapColorsDTO,
} from 'api/generated/services/sigNoz.schemas';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigTiles from '../../controls/ConfigTiles/ConfigTiles';
import { createFieldResetter } from '../../utils/changes';
import HeatmapColorStepsField from './HeatmapColorStepsField';
import HeatmapCountRangeField from './HeatmapCountRangeField';
import HeatmapFillField from './HeatmapFillField';
import HeatmapPaletteGrid from './HeatmapPaletteGrid';
import HeatmapRampPreview from './HeatmapRampPreview';
import {
	COLOR_MODE_HELP,
	COLOR_MODE_OPTIONS,
	COLOR_SCALE_HELP,
	COLOR_SCALE_OPTIONS,
	DEFAULT_COLOR_MODE,
	DEFAULT_COLOR_SCALE,
	DEFAULT_PALETTE,
} from './heatmapColorOptions';

interface HeatmapColorsFieldProps {
	value: DashboardtypesHeatmapColorsDTO | undefined;
	savedValue?: DashboardtypesHeatmapColorsDTO;
	onChange: (next: DashboardtypesHeatmapColorsDTO) => void;
}

/**
 * Edits `chartAppearance.colors` — how a cell's count becomes a colour. Palette
 * mode ramps through a sequential palette, opacity mode through one fill's alpha;
 * everything below the mode applies to both.
 */
function HeatmapColorsField({
	value,
	savedValue,
	onChange,
}: HeatmapColorsFieldProps): JSX.Element {
	const reset = createFieldResetter(value, savedValue, onChange);
	// Unset fields select what the chart draws for them.
	const mode = value?.mode ?? DEFAULT_COLOR_MODE;
	const scale = value?.scale ?? DEFAULT_COLOR_SCALE;

	return (
		<>
			<HeatmapRampPreview colors={value} />

			<ConfigField
				label="Colour mode"
				help={COLOR_MODE_HELP[mode]}
				{...reset('mode')}
			>
				<ConfigTiles
					testId="panel-editor-v2-heatmap-color-mode"
					aria-label="Colour mode"
					value={mode}
					items={COLOR_MODE_OPTIONS}
					onChange={(next): void => onChange({ ...value, mode: next })}
				/>
			</ConfigField>

			{mode === DashboardtypesHeatmapColorModeDTO.opacity ? (
				<HeatmapFillField
					value={value?.fill}
					{...reset('fill')}
					onChange={(fill): void => onChange({ ...value, fill })}
				/>
			) : (
				<ConfigField label="Palette" {...reset('palette')}>
					<HeatmapPaletteGrid
						value={value?.palette ?? DEFAULT_PALETTE}
						onChange={(palette): void => onChange({ ...value, palette })}
					/>
				</ConfigField>
			)}

			<ConfigField
				label="Colour scale"
				help={COLOR_SCALE_HELP[scale]}
				{...reset('scale')}
			>
				<ConfigTiles
					testId="panel-editor-v2-heatmap-color-scale"
					aria-label="Colour scale"
					value={scale}
					items={COLOR_SCALE_OPTIONS}
					onChange={(next): void => onChange({ ...value, scale: next })}
				/>
			</ConfigField>

			<HeatmapColorStepsField
				value={value?.steps || undefined}
				{...reset('steps')}
				onChange={(steps): void => onChange({ ...value, steps })}
			/>

			<HeatmapCountRangeField
				value={{ minCount: value?.minCount, maxCount: value?.maxCount }}
				{...reset('minCount', 'maxCount')}
				onChange={(bounds): void => onChange({ ...value, ...bounds })}
			/>
		</>
	);
}

export default HeatmapColorsField;
