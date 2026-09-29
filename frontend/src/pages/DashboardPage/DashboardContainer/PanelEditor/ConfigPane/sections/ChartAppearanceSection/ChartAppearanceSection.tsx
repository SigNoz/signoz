import cx from 'classnames';
import { resolveFillOpacity } from 'lib/uPlotV2/utils/fillOpacity';
import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigSlider from '../../controls/ConfigSlider/ConfigSlider';
import ConfigSwitch from '../../controls/ConfigSwitch/ConfigSwitch';
import ConfigTiles from '../../controls/ConfigTiles/ConfigTiles';
import { SWITCH_SKETCHES } from '../../controls/drawings/switchSketches';
import type { SectionEditorContext } from '../../sectionContext';
import { createFieldResetter } from '../../utils/changes';
import DisconnectValuesField from './DisconnectValuesField';
import HeatmapColorsField from './HeatmapColorsField';
import {
	FILL_MODE_OPTIONS,
	FILLED_FILL_MODE_OPTIONS,
	LINE_INTERPOLATION_HELP,
	LINE_INTERPOLATION_OPTIONS,
	LINE_STYLE_OPTIONS,
} from './options';
import { formatOpacity } from './utils';

import styles from './ChartAppearanceSection.module.scss';

const FILL_OPACITY_STEP = 0.01;

/**
 * Edits the `chartAppearance` slice of a panel spec: line style / interpolation, fill
 * mode, fill opacity, point markers and the connect-null-gaps threshold for the
 * time-axis charts, the cell colour ramp for the heatmap. Each control is gated by its
 * `controls` flag.
 */
function ChartAppearanceSection({
	value,
	defaultValue,
	controls,
	onChange,
	stepInterval,
}: SectionEditorProps<SectionKind.ChartAppearance> &
	Pick<SectionEditorContext, 'stepInterval'>): JSX.Element {
	const reset = createFieldResetter(value, defaultValue, onChange);
	const interpolation = value?.lineInterpolation;

	return (
		<>
			{controls.lineStyle && (
				<ConfigField label="Line" {...reset('lineStyle')}>
					<ConfigTiles
						testId="panel-editor-v2-line-style"
						aria-label="Line style"
						value={value?.lineStyle}
						items={LINE_STYLE_OPTIONS}
						onChange={(lineStyle): void => onChange({ ...value, lineStyle })}
					/>
				</ConfigField>
			)}

			{controls.lineInterpolation && (
				<ConfigField
					label="How points connect"
					help={interpolation && LINE_INTERPOLATION_HELP[interpolation]}
					{...reset('lineInterpolation')}
				>
					<ConfigTiles
						testId="panel-editor-v2-line-interpolation"
						aria-label="How points connect"
						value={interpolation}
						items={LINE_INTERPOLATION_OPTIONS}
						onChange={(lineInterpolation): void =>
							onChange({ ...value, lineInterpolation })
						}
					/>
				</ConfigField>
			)}

			{controls.fillMode && (
				<ConfigField
					label="Area under the line"
					{...reset('fillMode', 'fillOpacity')}
				>
					<ConfigTiles
						testId="panel-editor-v2-fill-mode"
						aria-label="Area under the line"
						value={value?.fillMode}
						items={
							controls.fillOpacity ? FILLED_FILL_MODE_OPTIONS : FILL_MODE_OPTIONS
						}
						onChange={(fillMode): void => onChange({ ...value, fillMode })}
					/>
					{controls.fillOpacity && (
						<div className={cx(styles.inset, styles.insetRow)}>
							<span className={styles.insetLabel}>Opacity</span>
							<div className={styles.opacitySlider}>
								<ConfigSlider
									testId="panel-editor-v2-fill-opacity"
									// The chart's own default, so the thumb starts where an unset fill renders.
									value={resolveFillOpacity(value?.fillOpacity)}
									min={0}
									max={1}
									step={FILL_OPACITY_STEP}
									formatValue={formatOpacity}
									onChange={(fillOpacity): void => onChange({ ...value, fillOpacity })}
								/>
							</div>
						</div>
					)}
				</ConfigField>
			)}

			{controls.showPoints && (
				<ConfigSwitch
					testId="panel-editor-v2-show-points"
					title="Show points"
					description="Marks each sample the query returned."
					sketch={SWITCH_SKETCHES.points}
					changed={reset('showPoints').changed}
					value={value?.showPoints ?? false}
					onChange={(showPoints): void => onChange({ ...value, showPoints })}
				/>
			)}

			{controls.spanGaps && (
				<DisconnectValuesField
					testId="panel-editor-v2-span-gaps"
					value={value?.spanGaps}
					stepInterval={stepInterval}
					{...reset('spanGaps')}
					onChange={(spanGaps): void => onChange({ ...value, spanGaps })}
				/>
			)}

			{controls.colors && (
				<HeatmapColorsField
					value={value?.colors}
					onChange={(colors): void => onChange({ ...value, colors })}
				/>
			)}
		</>
	);
}

export default ChartAppearanceSection;
