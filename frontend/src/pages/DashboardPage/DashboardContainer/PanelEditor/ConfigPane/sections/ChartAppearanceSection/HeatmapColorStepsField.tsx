import { useState } from 'react';
import { Slider } from '@signozhq/ui/slider';
import { Typography } from '@signozhq/ui/typography';
import {
	clampColorSteps,
	DEFAULT_COLOR_STEPS,
	MAX_COLOR_STEPS,
	MIN_COLOR_STEPS,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/colorScale';

import { singleSliderValue } from './heatmapColorOptions';

import styles from './HeatmapColorsField.module.scss';

interface HeatmapColorStepsFieldProps {
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
}: HeatmapColorStepsFieldProps): JSX.Element {
	const [dragging, setDragging] = useState<number | null>(null);

	const steps = dragging ?? value ?? DEFAULT_COLOR_STEPS;

	return (
		<div className={styles.field}>
			<div className={styles.fieldHeader}>
				<Typography.Text>Color steps</Typography.Text>
				<span className={styles.mono}>{steps}</span>
			</div>
			<Slider
				testId="panel-editor-v2-heatmap-color-steps"
				className={styles.slider}
				value={steps}
				min={MIN_COLOR_STEPS}
				max={MAX_COLOR_STEPS}
				step={1}
				aria-label="Color steps"
				onChange={(next): void => setDragging(singleSliderValue(next))}
				onAfterChange={(next): void => {
					setDragging(null);
					onChange(clampColorSteps(singleSliderValue(next)));
				}}
			/>
			<Typography.Text className={styles.help}>
				How many colours the ramp is split into.
			</Typography.Text>
		</div>
	);
}

export default HeatmapColorStepsField;
