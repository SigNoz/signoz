import cx from 'classnames';
import type { DashboardtypesHeatmapPaletteDTO } from 'api/generated/services/sigNoz.schemas';
import { useIsDarkMode } from 'hooks/useDarkMode';

import { paletteGradient, PALETTE_OPTIONS } from './heatmapColorOptions';

import styles from './HeatmapColorsField.module.scss';

interface HeatmapPaletteGridProps {
	value: DashboardtypesHeatmapPaletteDTO;
	onChange: (palette: DashboardtypesHeatmapPaletteDTO) => void;
}

/** The palettes as the ramps they are: "lava" and "ember" name nothing visible. */
function HeatmapPaletteGrid({
	value,
	onChange,
}: HeatmapPaletteGridProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	return (
		<div className={styles.cards}>
			<div className={styles.cardGrid}>
				{PALETTE_OPTIONS.map((option) => (
					<button
						key={option.value}
						type="button"
						aria-pressed={option.value === value}
						className={cx(styles.card, {
							[styles.isSelected]: option.value === value,
						})}
						data-testid={`panel-editor-v2-heatmap-palette-${option.value}`}
						onClick={(): void => onChange(option.value)}
					>
						<span
							className={styles.cardRamp}
							style={{ background: paletteGradient(option.value, isDarkMode) }}
						/>
						<span className={styles.cardName}>{option.label}</span>
					</button>
				))}
			</div>
		</div>
	);
}

export default HeatmapPaletteGrid;
