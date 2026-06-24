import { Typography } from '@signozhq/ui/typography';
import { DashboardtypesPrecisionOptionDTO } from 'api/generated/services/sigNoz.schemas';
import YAxisUnitSelector from 'components/YAxisUnitSelector';
import { YAxisSource } from 'components/YAxisUnitSelector/types';
import type { SectionEditorProps } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';

import type { TableColumnOption } from '../../../hooks/useTableColumns';
import ConfigSelect from '../../controls/ConfigSelect/ConfigSelect';
import ColumnUnits from './ColumnUnits';

import styles from './FormattingSection.module.scss';

type FormattingSectionProps = SectionEditorProps<'formatting'> & {
	/** Table panel's resolved value columns; required for the column-units editor. */
	tableColumns?: TableColumnOption[];
};

// `full` means "show the raw value, no rounding"; the digits round to that many places.
const DECIMAL_OPTIONS: {
	value: DashboardtypesPrecisionOptionDTO;
	label: string;
}[] = [
	{ value: DashboardtypesPrecisionOptionDTO.NUMBER_0, label: '0 decimals' },
	{ value: DashboardtypesPrecisionOptionDTO.NUMBER_1, label: '1 decimal' },
	{ value: DashboardtypesPrecisionOptionDTO.NUMBER_2, label: '2 decimals' },
	{ value: DashboardtypesPrecisionOptionDTO.NUMBER_3, label: '3 decimals' },
	{ value: DashboardtypesPrecisionOptionDTO.NUMBER_4, label: '4 decimals' },
	{ value: DashboardtypesPrecisionOptionDTO.full, label: 'Full' },
];

/**
 * Edits the `formatting` slice of a panel spec (unit + decimal precision). Which
 * controls show is driven by the per-kind `controls` flags; the spec slice itself
 * is uniform across every kind that declares the Formatting section.
 */
function FormattingSection({
	value,
	controls,
	onChange,
	tableColumns = [],
}: FormattingSectionProps): JSX.Element {
	return (
		<>
			{controls.unit && (
				<div className={styles.field}>
					<Typography.Text>Unit</Typography.Text>
					<YAxisUnitSelector
						containerClassName={styles.unitSelector}
						data-testid="panel-editor-v2-unit"
						source={YAxisSource.DASHBOARDS}
						value={value?.unit}
						onChange={(unit): void => onChange({ ...value, unit })}
					/>
				</div>
			)}

			{controls.decimals && (
				<div className={styles.field}>
					<Typography.Text>Decimals</Typography.Text>
					<ConfigSelect
						testId="panel-editor-v2-decimals"
						placeholder="Select decimals…"
						value={value?.decimalPrecision}
						items={DECIMAL_OPTIONS}
						onChange={(next): void =>
							onChange({
								...value,
								decimalPrecision: next as DashboardtypesPrecisionOptionDTO,
							})
						}
					/>
				</div>
			)}

			{controls.columnUnits && (
				<div className={styles.field}>
					<Typography.Text>Column units</Typography.Text>
					<ColumnUnits
						columns={tableColumns}
						value={value?.columnUnits ?? {}}
						onChange={(columnUnits): void => onChange({ ...value, columnUnits })}
					/>
				</div>
			)}
		</>
	);
}

export default FormattingSection;
