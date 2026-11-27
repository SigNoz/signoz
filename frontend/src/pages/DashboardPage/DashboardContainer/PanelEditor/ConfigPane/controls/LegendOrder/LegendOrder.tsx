import { useMemo, useState } from 'react';
import { Search } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import { Input } from 'antd';
import type { DashboardtypesLegendDTOCustomOrder } from 'api/generated/services/sigNoz.schemas';
import { Virtuoso } from 'react-virtuoso';

import type { LegendSeries } from 'pages/DashboardPage/DashboardContainer/Panels/utils/legendSeries';
import { compareLegendLabels } from 'pages/DashboardPage/DashboardContainer/Panels/utils/sortSeriesForLegend';
import ConfigNumberInput from '../ConfigNumberInput/ConfigNumberInput';
import { filterLegendSeries } from '../LegendColors/legendColors.utils';
import { setSeriesOrder } from './legendOrder.utils';

import styles from './LegendOrder.module.scss';

interface LegendOrderProps {
	/** Panel's resolved series (from the shared preview query). */
	series: LegendSeries[];
	value: DashboardtypesLegendDTOCustomOrder | undefined;
	onChange: (next: Record<string, number>) => void;
}

/**
 * Per-series order indexes for the legend: a searchable, virtualized list of the
 * panel's resolved series, each with an integer input. An index writes
 * `{ [seriesLabel]: index }` into `legend.customOrder`; clearing the input drops the
 * entry, which leaves the series at index 0. Rows are listed by label rather than by
 * the resulting order, so a row does not move while its index is being typed.
 */
function LegendOrder({
	series,
	value,
	onChange,
}: LegendOrderProps): JSX.Element {
	const [query, setQuery] = useState('');

	const sorted = useMemo(
		() => [...series].sort((a, b) => compareLegendLabels(a.label, b.label)),
		[series],
	);

	if (series.length === 0) {
		return (
			<Typography.Text className={styles.empty}>
				Run the query to set an order for each series.
			</Typography.Text>
		);
	}

	const filtered = filterLegendSeries(sorted, query);

	return (
		<div className={styles.container} data-testid="panel-editor-v2-legend-order">
			<Input
				data-testid="panel-editor-v2-legend-order-search"
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
					style={{ height: Math.min(filtered.length * 38, 266) }}
					data={filtered}
					computeItemKey={(_, s): string => s.label}
					itemContent={(_, s): JSX.Element => (
						<div className={styles.row}>
							<span
								className={styles.swatch}
								style={{ backgroundColor: s.defaultColor }}
							/>
							<span className={styles.label} title={s.label}>
								{s.label}
							</span>
							<div className={styles.index}>
								<ConfigNumberInput
									testId={`legend-order-${s.label}`}
									placeholder="0"
									value={value?.[s.label]}
									onChange={(index): void =>
										onChange(setSeriesOrder(value, s.label, index))
									}
								/>
							</div>
						</div>
					)}
				/>
			)}
		</div>
	);
}

export default LegendOrder;
