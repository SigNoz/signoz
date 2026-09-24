import { Typography } from '@signozhq/ui/typography';
import YAxisUnitSelector from 'components/YAxisUnitSelector';
import { YAxisSource } from 'components/YAxisUnitSelector/types';

import type { TableColumnOption } from '../../../hooks/useTableColumns';

import styles from './FormattingSection.module.scss';

interface ColumnUnitsProps {
	/** Resolved value columns of the panel's current table result. */
	columns: TableColumnOption[];
	/** Current per-column unit map (`formatting.columnUnits`), keyed by column key. */
	value: Record<string, string>;
	/** Unit the selected metric was sent with; each column warns if its unit mismatches. */
	metricUnit?: string;
	onChange: (next: Record<string, string>) => void;
}

/**
 * Per-column unit picker for Table panels: one unit selector per resolved value
 * column, writing `{ [columnKey]: unitId }` keyed by the query identifier (V1
 * parity). Clearing a column's unit drops its entry. Until the panel produces
 * columns, shows a hint.
 */
function ColumnUnits({
	columns,
	value,
	metricUnit,
	onChange,
}: ColumnUnitsProps): JSX.Element {
	if (columns.length === 0) {
		return (
			<Typography.Text className={styles.columnUnitsHint}>
				Run the panel to set per-column units.
			</Typography.Text>
		);
	}

	const setUnit = (columnKey: string, unit: string | undefined): void => {
		const next = { ...value };
		if (unit) {
			next[columnKey] = unit;
		} else {
			delete next[columnKey];
		}
		onChange(next);
	};

	return (
		<div className={styles.columnUnits}>
			{columns.map((column) => (
				<div className={styles.columnField} key={column.key}>
					<Typography.Text>{column.label}</Typography.Text>
					<YAxisUnitSelector
						data-testid={`panel-editor-v2-column-unit-${column.key}`}
						placeholder="Select unit"
						source={YAxisSource.DASHBOARDS}
						value={value[column.key]}
						initialValue={metricUnit}
						containerClassName={styles.columnUnitSelector}
						onChange={(unit): void => setUnit(column.key, unit)}
					/>
				</div>
			))}
		</div>
	);
}

export default ColumnUnits;
