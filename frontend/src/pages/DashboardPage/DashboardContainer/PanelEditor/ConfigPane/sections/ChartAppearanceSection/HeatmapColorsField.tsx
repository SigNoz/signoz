import type { ChangeEvent } from 'react';
import { ColorPicker, Input } from 'antd';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import {
	DashboardtypesHeatmapColorModeDTO,
	type DashboardtypesHeatmapColorsDTO,
	type DashboardtypesHeatmapColorScaleDTO,
	type DashboardtypesHeatmapPaletteDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useIsDarkMode } from 'hooks/useDarkMode';
import {
	MAX_COLOR_STEPS,
	MIN_COLOR_STEPS,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/colorScale';

import ConfigSegmented from '../../controls/ConfigSegmented/ConfigSegmented';
import ConfigSelect from '../../controls/ConfigSelect/ConfigSelect';
import {
	COLOR_MODE_OPTIONS,
	COLOR_SCALE_OPTIONS,
	PALETTE_OPTIONS,
	paletteGradient,
} from './heatmapColorOptions';

import styles from './HeatmapColorsField.module.scss';

/** The two count bounds; `null` on either asks for the derived one. */
type CountBound = 'minCount' | 'maxCount';

interface HeatmapColorsFieldProps {
	value: DashboardtypesHeatmapColorsDTO | undefined;
	onChange: (next: DashboardtypesHeatmapColorsDTO) => void;
}

/**
 * Edits `chartAppearance.colors` — how a cell's count becomes a colour. Palette mode
 * ramps through a sequential palette; opacity mode ramps one fill's alpha. Both share
 * the ramp's distribution, its step count, and the counts the ramp is stretched
 * between, so those stay visible in either mode.
 */
function HeatmapColorsField({
	value,
	onChange,
}: HeatmapColorsFieldProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const isOpacityMode =
		value?.mode === DashboardtypesHeatmapColorModeDTO.opacity;

	// Empty clears the bound to null (derived from the grid); otherwise parse to a
	// number, ignoring transient non-numeric input by leaving it unset.
	const handleCountBound =
		(bound: CountBound) =>
		(e: ChangeEvent<HTMLInputElement>): void => {
			const raw = e.target.value;
			const next = raw === '' || Number.isNaN(Number(raw)) ? null : Number(raw);
			onChange({ ...value, [bound]: next });
		};

	// An out-of-range step count is rejected on save, so clamp on commit rather than
	// letting the panel look editable and then fail. Empty restores the default.
	const handleSteps = (e: ChangeEvent<HTMLInputElement>): void => {
		const raw = e.target.value;
		if (raw === '' || Number.isNaN(Number(raw))) {
			onChange({ ...value, steps: undefined });
			return;
		}
		const steps = Math.min(
			Math.max(Math.round(Number(raw)), MIN_COLOR_STEPS),
			MAX_COLOR_STEPS,
		);
		onChange({ ...value, steps });
	};

	return (
		<div className={styles.colors}>
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
				<div className={styles.field}>
					<Typography.Text>Fill color</Typography.Text>
					<div className={styles.fill}>
						<ColorPicker
							value={value?.fill || null}
							size="small"
							showText
							trigger="click"
							onChangeComplete={(next): void =>
								onChange({ ...value, fill: next.toHexString() })
							}
						/>
						{value?.fill && (
							<Button
								size="sm"
								color="secondary"
								variant="ghost"
								testId="panel-editor-v2-heatmap-fill-reset"
								onClick={(): void => onChange({ ...value, fill: '' })}
							>
								Reset
							</Button>
						)}
					</div>
				</div>
			) : (
				<div className={styles.field}>
					<Typography.Text>Palette</Typography.Text>
					<ConfigSelect
						testId="panel-editor-v2-heatmap-palette"
						placeholder="Select palette…"
						value={value?.palette}
						items={PALETTE_OPTIONS.map((option) => ({
							...option,
							icon: (
								<span
									className={styles.swatch}
									style={{ background: paletteGradient(option.value, isDarkMode) }}
								/>
							),
						}))}
						onChange={(next): void =>
							onChange({ ...value, palette: next as DashboardtypesHeatmapPaletteDTO })
						}
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
			</div>

			<div className={styles.field}>
				<Typography.Text>Color steps</Typography.Text>
				<Input
					data-testid="panel-editor-v2-heatmap-color-steps"
					type="number"
					min={MIN_COLOR_STEPS}
					max={MAX_COLOR_STEPS}
					placeholder="Auto"
					value={value?.steps ?? ''}
					onChange={handleSteps}
				/>
			</div>

			<div className={styles.bounds}>
				<div className={styles.field}>
					<Typography.Text>Min count</Typography.Text>
					<Input
						data-testid="panel-editor-v2-heatmap-min-count"
						type="number"
						placeholder="Auto"
						value={value?.minCount ?? ''}
						onChange={handleCountBound('minCount')}
					/>
				</div>
				<div className={styles.field}>
					<Typography.Text>Max count</Typography.Text>
					<Input
						data-testid="panel-editor-v2-heatmap-max-count"
						type="number"
						placeholder="Auto"
						value={value?.maxCount ?? ''}
						onChange={handleCountBound('maxCount')}
					/>
				</div>
			</div>
		</div>
	);
}

export default HeatmapColorsField;
