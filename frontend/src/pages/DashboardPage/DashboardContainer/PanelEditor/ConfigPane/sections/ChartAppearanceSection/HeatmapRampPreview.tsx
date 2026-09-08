import { useMemo } from 'react';
import { Typography } from '@signozhq/ui/typography';
import type { DashboardtypesHeatmapColorsDTO } from 'api/generated/services/sigNoz.schemas';
import { useIsDarkMode } from 'hooks/useDarkMode';
import {
	createHeatmapColorResolver,
	DEFAULT_HEATMAP_COLORS,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/colorScale';
import { HeatmapColorMode } from 'lib/uPlotV2/plugins/HeatmapPlugin/types';
import { resolveHeatmapColors } from 'pages/DashboardPage/DashboardContainer/Panels/utils/chartAppearance/resolvers';

import { rampGradient } from './heatmapColorOptions';

import styles from './HeatmapColorsField.module.scss';

/** The ramp is domain-independent; the preview shows colours, not positions. */
const NOMINAL_DOMAIN = { min: 0, max: 1 };

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
		options.mode === HeatmapColorMode.Opacity ? 'opacity' : options.palette,
		options.scale,
		`${options.steps} steps`,
	].join(' · ');

	return (
		<div className={styles.preview} data-testid="panel-editor-v2-heatmap-preview">
			<div className={styles.previewHeader}>
				<Typography.Text>Preview</Typography.Text>
				<span className={styles.mono}>{summary}</span>
			</div>
			<div
				className={styles.previewRamp}
				style={{ background: rampGradient(ramp) }}
			/>
			<div className={styles.previewBounds}>
				<span className={styles.mono}>
					{(colors?.minCount ?? 0).toLocaleString()}
				</span>
				<span className={styles.mono}>
					{colors?.maxCount == null ? 'auto' : colors.maxCount.toLocaleString()}
				</span>
			</div>
		</div>
	);
}

export default HeatmapRampPreview;
