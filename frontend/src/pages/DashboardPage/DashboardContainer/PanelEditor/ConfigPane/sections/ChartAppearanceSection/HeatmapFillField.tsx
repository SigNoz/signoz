import cx from 'classnames';
import { ColorPicker } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { DEFAULT_OPACITY_FILL } from 'lib/uPlotV2/plugins/HeatmapPlugin/colorScale';

import { FILL_PRESETS, isSameColor } from './heatmapColorOptions';

import styles from './HeatmapColorsField.module.scss';

interface HeatmapFillFieldProps {
	/** Empty follows the selected group's legend colour. */
	value: string | undefined;
	onChange: (fill: string) => void;
}

/**
 * The colour opacity mode ramps the alpha of. Any hex goes, since the point of
 * the fill is matching whatever else the dashboard already uses.
 */
function HeatmapFillField({
	value,
	onChange,
}: HeatmapFillFieldProps): JSX.Element {
	const isAuto = !value;
	const isCustom =
		!isAuto && !FILL_PRESETS.some((preset) => isSameColor(preset.color, value));

	return (
		<div className={styles.field}>
			<Typography.Text>Base color</Typography.Text>

			<div className={styles.fillGrid}>
				{FILL_PRESETS.map((preset) => (
					<button
						key={preset.label}
						type="button"
						aria-pressed={isSameColor(preset.color, value)}
						className={cx(styles.paletteCard, {
							[styles.isSelected]: isSameColor(preset.color, value),
						})}
						data-testid={`panel-editor-v2-heatmap-fill-${preset.label}`}
						onClick={(): void => onChange(preset.color)}
					>
						<span
							className={styles.paletteRamp}
							style={{ background: preset.color }}
						/>
						<span className={styles.mono}>{preset.label}</span>
					</button>
				))}
			</div>

			<ColorPicker
				value={value || DEFAULT_OPACITY_FILL}
				trigger="click"
				onChangeComplete={(next): void => onChange(next.toHexString())}
			>
				<button
					type="button"
					className={cx(styles.customFill, {
						[styles.isSelected]: isCustom,
					})}
					data-testid="panel-editor-v2-heatmap-fill-custom"
				>
					<Typography.Text>Custom</Typography.Text>
					<span className={styles.customFillValue}>
						<span className={styles.mono}>
							{isAuto ? 'group colour' : value.toUpperCase()}
						</span>
						<span
							className={styles.customFillSwatch}
							style={{ background: value || DEFAULT_OPACITY_FILL }}
						/>
					</span>
				</button>
			</ColorPicker>

			<Typography.Text className={styles.help}>
				The colour whose alpha ramps; unset uses the group&apos;s.
			</Typography.Text>
		</div>
	);
}

export default HeatmapFillField;
