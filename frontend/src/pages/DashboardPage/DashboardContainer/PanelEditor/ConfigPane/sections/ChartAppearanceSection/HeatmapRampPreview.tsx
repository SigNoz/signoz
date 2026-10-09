import { useMemo } from 'react';
import {
	DashboardtypesHeatmapColorModeDTO,
	type DashboardtypesHeatmapColorsDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useIsDarkMode } from 'hooks/useDarkMode';
import {
	createHeatmapColorResolver,
	DEFAULT_HEATMAP_COLORS,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/colorScale';
import { resolveHeatmapColors } from 'pages/DashboardPage/DashboardContainer/Panels/utils/chartAppearance/resolvers';

import ConfigField from '../../controls/ConfigField/ConfigField';
import {
	DEFAULT_COLOR_MODE,
	DEFAULT_COLOR_SCALE,
	DEFAULT_PALETTE,
	rampGradient,
} from './heatmapColorOptions';

import styles from './HeatmapColorsField.module.scss';

/** The ramp is domain-independent; the preview shows colours, not positions. */
const NOMINAL_DOMAIN = { min: 0, max: 1, logFloor: 1 };

interface HeatmapRampPreviewProps {
	colors: DashboardtypesHeatmapColorsDTO | undefined;
}

/**
 * The ramp the grid will draw, resolved through the chart's own colour resolver.
 * Its ends carry the counts it is stretched between; an unset maximum is only
 * known once the data arrives.
 */
function HeatmapRampPreview({ colors }: HeatmapRampPreviewProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const options = useMemo(
		() => ({ ...DEFAULT_HEATMAP_COLORS, ...resolveHeatmapColors(colors) }),
		[colors],
	);

	const ramp = useMemo(
		() =>
			createHeatmapColorResolver({
				options,
				domain: NOMINAL_DOMAIN,
				isDarkMode,
				// No group to follow here, so the resolver's fallback fill stands in.
				seriesColor: '',
			}).ramp,
		[options, isDarkMode],
	);

	const summary = [
		(colors?.mode ?? DEFAULT_COLOR_MODE) ===
		DashboardtypesHeatmapColorModeDTO.opacity
			? DashboardtypesHeatmapColorModeDTO.opacity
			: (colors?.palette ?? DEFAULT_PALETTE),
		colors?.scale ?? DEFAULT_COLOR_SCALE,
		`${options.steps} steps`,
	].join(' · ');

	return (
		<div data-testid="panel-editor-v2-heatmap-preview">
			<ConfigField label="Preview" aside={summary}>
				<div className={styles.preview}>
					<div
						className={styles.previewRamp}
						style={{ background: rampGradient(ramp) }}
					/>
					<div className={styles.previewBounds}>
						<span>{(colors?.minCount ?? 0).toLocaleString()}</span>
						<span>
							{colors?.maxCount == null ? 'auto' : colors.maxCount.toLocaleString()}
						</span>
					</div>
				</div>
			</ConfigField>
		</div>
	);
}

export default HeatmapRampPreview;
