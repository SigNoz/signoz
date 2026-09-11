import { Typography } from '@signozhq/ui/typography';
import {
	DashboardtypesLegendPositionDTO,
	DashboardtypesSeriesOrderDTO,
} from 'api/generated/services/sigNoz.schemas';
import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigSegmented from '../../controls/ConfigSegmented/ConfigSegmented';
import ConfigSelect, {
	type ConfigSelectItem,
} from '../../controls/ConfigSelect/ConfigSelect';
import LegendColors from '../../controls/LegendColors/LegendColors';
import type { SectionEditorContext } from '../../sectionContext';

import styles from './LegendSection.module.scss';

type LegendSectionProps = SectionEditorProps<SectionKind.Legend> &
	Pick<SectionEditorContext, 'legendSeries'>;

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

// Which order the legend lists series in (and the chart draws them). "Largest
// first" sorts by mean value, so the order follows the data; "Query order" pins
// it to the panel's query list, so it stays put across refreshes.
const SERIES_ORDER_OPTIONS: ConfigSelectItem<DashboardtypesSeriesOrderDTO>[] = [
	{ value: DashboardtypesSeriesOrderDTO.mean_desc, label: 'Largest first' },
	{ value: DashboardtypesSeriesOrderDTO.definition, label: 'Query order' },
];

/**
 * Edits the `legend` slice of a panel spec: legend position, series order, and
 * per-series color overrides. The colors control reads the panel's resolved series
 * from context (the shared preview query) and writes `customColors` keyed by series
 * label.
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

			{controls.seriesOrder && (
				<div className={styles.field}>
					<Typography.Text>Series order</Typography.Text>
					<ConfigSelect
						testId="panel-editor-v2-legend-series-order"
						placeholder="Select order…"
						value={value?.seriesOrder}
						items={SERIES_ORDER_OPTIONS}
						onChange={(seriesOrder): void => onChange({ ...value, seriesOrder })}
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
