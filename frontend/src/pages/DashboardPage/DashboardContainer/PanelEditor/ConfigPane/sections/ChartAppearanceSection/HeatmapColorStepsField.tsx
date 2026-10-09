import { useState } from 'react';
import {
	clampColorSteps,
	DEFAULT_COLOR_STEPS,
	MAX_COLOR_STEPS,
	MIN_COLOR_STEPS,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/colorScale';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigSlider from '../../controls/ConfigSlider/ConfigSlider';
import type { FieldResetProps } from '../../utils/changes';

interface HeatmapColorStepsFieldProps extends Partial<FieldResetProps> {
	/** Unset until the slider moves; the chart's default stands in. */
	value: number | undefined;
	onChange: (steps: number) => void;
}

/**
 * How many colours the ramp is quantised into. Committed on release, so a drag
 * doesn't write every value it passes through to the spec.
 */
function HeatmapColorStepsField({
	value,
	onChange,
	changed,
	onReset,
}: HeatmapColorStepsFieldProps): JSX.Element {
	const [dragging, setDragging] = useState<number | null>(null);

	return (
		<ConfigField
			label="Color steps"
			help="Fewer steps make bands easier to tell apart."
			changed={changed}
			onReset={onReset}
		>
			<ConfigSlider
				testId="panel-editor-v2-heatmap-color-steps"
				value={dragging ?? value ?? DEFAULT_COLOR_STEPS}
				min={MIN_COLOR_STEPS}
				max={MAX_COLOR_STEPS}
				step={1}
				onChange={setDragging}
				onChangeEnd={(next): void => {
					setDragging(null);
					onChange(clampColorSteps(next));
				}}
			/>
		</ConfigField>
	);
}

export default HeatmapColorStepsField;
