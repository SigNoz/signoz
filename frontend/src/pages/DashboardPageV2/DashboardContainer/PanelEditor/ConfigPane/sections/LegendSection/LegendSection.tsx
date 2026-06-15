import { Typography } from '@signozhq/ui/typography';
import { DashboardtypesLegendPositionDTO } from 'api/generated/services/sigNoz.schemas';
import type { SectionEditorProps } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';

import ConfigSegmented from '../../controls/ConfigSegmented/ConfigSegmented';
import LegendColors from '../../controls/LegendColors/LegendColors';
import type { LegendSeries } from '../../../hooks/useLegendSeries';

import styles from './LegendSection.module.scss';

type LegendSectionProps = SectionEditorProps<'legend'> & {
	/** Panel's resolved series, forwarded by SectionSlot for the colors control. */
	legendSeries?: LegendSeries[];
};

const POSITION_OPTIONS = [
	{
		value: DashboardtypesLegendPositionDTO.bottom,
		label: 'Bottom',
		icon: 'pos-bottom' as const,
	},
	{
		value: DashboardtypesLegendPositionDTO.right,
		label: 'Right',
		icon: 'pos-right' as const,
	},
];

/**
 * Edits the `legend` slice of a panel spec: legend position and per-series color
 * overrides. The colors control reads the panel's resolved series from context (the
 * shared preview query) and writes `customColors` keyed by series label.
 */
function LegendSection({
	value,
	controls,
	onChange,
	legendSeries,
}: LegendSectionProps): JSX.Element {
	return (
		<>
			{controls.position && (
				<div className={styles.field}>
					<Typography.Text>Position</Typography.Text>
					<ConfigSegmented
						testId="panel-editor-v2-legend-position"
						items={POSITION_OPTIONS}
						value={value?.position}
						onChange={(next): void =>
							onChange({
								...value,
								position: next as DashboardtypesLegendPositionDTO,
							})
						}
					/>
				</div>
			)}

			{controls.colors && (
				<div className={styles.field}>
					<Typography.Text>Series colors</Typography.Text>
					<LegendColors
						series={legendSeries ?? []}
						value={value?.customColors}
						onChange={(customColors): void => onChange({ ...value, customColors })}
					/>
				</div>
			)}
		</>
	);
}

export default LegendSection;
