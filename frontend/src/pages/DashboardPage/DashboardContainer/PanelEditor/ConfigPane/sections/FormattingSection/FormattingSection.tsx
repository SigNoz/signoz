import YAxisUnitSelector from 'components/YAxisUnitSelector';
import { YAxisSource } from 'components/YAxisUnitSelector/types';
import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigField from '../../controls/ConfigField/ConfigField';
import type { SectionEditorContext } from '../../sectionContext';
import { createFieldResetter } from '../../utils/changes';
import ColumnUnits from './ColumnUnits';
import DecimalsField from './DecimalsField';

import styles from './FormattingSection.module.scss';

type FormattingSectionProps = SectionEditorProps<SectionKind.Formatting> &
	Pick<SectionEditorContext, 'tableColumns' | 'metricUnit'>;

/**
 * Edits the `formatting` slice of a panel spec (unit + decimal precision). Which
 * controls show is driven by the per-kind `controls` flags; the spec slice itself
 * is uniform across every kind that declares the Formatting section.
 */
function FormattingSection({
	value,
	defaultValue,
	controls,
	onChange,
	tableColumns = [],
	metricUnit,
}: FormattingSectionProps): JSX.Element {
	const reset = createFieldResetter(value, defaultValue, onChange);

	return (
		<>
			{controls.unit && (
				<ConfigField
					label="Unit"
					help="Labels values, axis ticks and tooltips. With milliseconds, 1500 shows as 1.5 s."
					{...reset('unit')}
				>
					<YAxisUnitSelector
						containerClassName={styles.unitSelector}
						data-testid="panel-editor-v2-unit"
						source={YAxisSource.DASHBOARDS}
						value={value?.unit}
						initialValue={metricUnit}
						onChange={(unit): void => onChange({ ...value, unit })}
					/>
				</ConfigField>
			)}

			{controls.decimals && (
				<DecimalsField
					value={value?.decimalPrecision}
					unit={value?.unit}
					{...reset('decimalPrecision')}
					onChange={(decimalPrecision): void =>
						onChange({ ...value, decimalPrecision })
					}
				/>
			)}

			{controls.columnUnits && (
				<ConfigField label="Column units" {...reset('columnUnits')}>
					<ColumnUnits
						columns={tableColumns}
						value={value?.columnUnits ?? {}}
						metricUnit={metricUnit}
						onChange={(columnUnits): void => onChange({ ...value, columnUnits })}
					/>
				</ConfigField>
			)}
		</>
	);
}

export default FormattingSection;
