import { useState } from 'react';
import { Search } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import { Input } from 'antd';
import type { DashboardtypesLegendDTOCustomColors } from 'api/generated/services/sigNoz.schemas';
import { Virtuoso } from 'react-virtuoso';

import type { LegendSeries } from '../../../utils/legendSeries';
import LegendColorRow from './LegendColorRow';
import {
	clearSeriesColor,
	filterLegendSeries,
	resolveSeriesColor,
	setSeriesColor,
} from './legendColors.utils';

import styles from './LegendColors.module.scss';

interface LegendColorsProps {
	/** Panel's resolved series (from the shared preview query). */
	series: LegendSeries[];
	value: DashboardtypesLegendDTOCustomColors | undefined;
	onChange: (next: Record<string, string>) => void;
}

/**
 * Per-series color overrides for the legend: a searchable, virtualized list of the
 * panel's resolved series, each with an antd ColorPicker swatch. Picking a color writes
 * `{ [seriesLabel]: hex }` into `legend.customColors` — the same label the chart keys its
 * color lookup on; Reset drops the override. Virtualized so panels with hundreds of
 * series stay responsive. Until the query produces series, shows a hint.
 */
function LegendColors({
	series,
	value,
	onChange,
}: LegendColorsProps): JSX.Element {
	const [query, setQuery] = useState('');

	if (series.length === 0) {
		return (
			<Typography.Text className={styles.empty}>
				Run the panel to customise series colors.
			</Typography.Text>
		);
	}

	const filtered = filterLegendSeries(series, query);

	return (
		<div className={styles.container} data-testid="panel-editor-v2-legend-colors">
			<Input
				data-testid="panel-editor-v2-legend-search"
				placeholder="Search series…"
				value={query}
				prefix={<Search size={14} />}
				onChange={(e): void => setQuery(e.target.value)}
			/>
			{filtered.length === 0 ? (
				<Typography.Text className={styles.empty}>
					No series match “{query}”.
				</Typography.Text>
			) : (
				<Virtuoso
					className={styles.list}
					style={{ height: Math.min(filtered.length * 34, 240) }}
					data={filtered}
					itemContent={(_, s): JSX.Element => (
						<LegendColorRow
							label={s.label}
							color={resolveSeriesColor(value, s.label, s.defaultColor)}
							isOverridden={value?.[s.label] !== undefined}
							onChange={(hex): void => onChange(setSeriesColor(value, s.label, hex))}
							onReset={(): void => onChange(clearSeriesColor(value, s.label))}
						/>
					)}
				/>
			)}
		</div>
	);
}

export default LegendColors;
