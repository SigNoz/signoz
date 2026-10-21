import { Callout } from '@signozhq/ui/callout';
import {
	DashboardtypesHeatmapColorModeDTO,
	type DashboardtypesGeoMapColorsDTO,
	type DashboardtypesHeatmapColorScaleDTO,
} from 'api/generated/services/sigNoz.schemas';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigRangeInput from '../../controls/ConfigRangeInput/ConfigRangeInput';
import { isRangeInverted } from '../../controls/ConfigRangeInput/utils';
import ConfigTiles from '../../controls/ConfigTiles/ConfigTiles';
import { createFieldResetter } from '../../utils/changes';
import HeatmapColorStepsField from './HeatmapColorStepsField';
import HeatmapFillField from './HeatmapFillField';
import HeatmapPaletteGrid from './HeatmapPaletteGrid';
import HeatmapRampPreview from './HeatmapRampPreview';
import {
	COLOR_MODE_OPTIONS,
	COLOR_SCALE_OPTIONS,
	DEFAULT_COLOR_MODE,
	DEFAULT_COLOR_SCALE,
	DEFAULT_PALETTE,
} from './heatmapColorOptions';

const MODE_HELP: Record<DashboardtypesHeatmapColorModeDTO, string> = {
	palette: 'Each value maps to a color on a multi-color ramp.',
	opacity: 'One color fades from clear to solid with the value.',
};

const SCALE_HELP: Record<DashboardtypesHeatmapColorScaleDTO, string> = {
	log: 'Keeps small values visible next to large ones.',
	sqrt: 'A middle ground between Log and Linear.',
	linear: 'Color changes evenly with value.',
};

interface GeoMapColorsFieldProps {
	value: DashboardtypesGeoMapColorsDTO | undefined;
	savedValue?: DashboardtypesGeoMapColorsDTO;
	onChange: (next: DashboardtypesGeoMapColorsDTO) => void;
}

/** Edits the geo map's `chartAppearance.colors`, from the heatmap's ramp controls. */
function GeoMapColorsField({
	value,
	savedValue,
	onChange,
}: GeoMapColorsFieldProps): JSX.Element {
	const reset = createFieldResetter(value, savedValue, onChange);
	const scale = value?.scale ?? DEFAULT_COLOR_SCALE;
	const mode = value?.mode ?? DEFAULT_COLOR_MODE;

	return (
		<>
			<HeatmapRampPreview
				colors={value && { ...value, minCount: value.min, maxCount: value.max }}
			/>

			<ConfigField label="Color mode" help={MODE_HELP[mode]} {...reset('mode')}>
				<ConfigTiles
					testId="panel-editor-v2-geo-map-color-mode"
					aria-label="Color mode"
					value={mode}
					items={COLOR_MODE_OPTIONS}
					onChange={(next): void => onChange({ ...value, mode: next })}
				/>
			</ConfigField>

			{mode === DashboardtypesHeatmapColorModeDTO.opacity ? (
				<HeatmapFillField
					value={value?.fill}
					withGroupColor={false}
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
				label="Color scale"
				help={SCALE_HELP[scale]}
				{...reset('scale')}
			>
				<ConfigTiles
					testId="panel-editor-v2-geo-map-color-scale"
					aria-label="Color scale"
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

			<ConfigField
				label="Value range"
				{...reset('min', 'max')}
				help={
					isRangeInverted(value?.min, value?.max) ? (
						<Callout type="error" size="small" showIcon>
							Min can&apos;t be greater than max.
						</Callout>
					) : (
						'Leave empty to read the range from the data.'
					)
				}
			>
				<ConfigRangeInput
					minTestId="panel-editor-v2-geo-map-min-value"
					maxTestId="panel-editor-v2-geo-map-max-value"
					min={value?.min}
					max={value?.max}
					onChangeMin={(min): void => onChange({ ...value, min })}
					onChangeMax={(max): void => onChange({ ...value, max })}
				/>
			</ConfigField>
		</>
	);
}

export default GeoMapColorsField;
