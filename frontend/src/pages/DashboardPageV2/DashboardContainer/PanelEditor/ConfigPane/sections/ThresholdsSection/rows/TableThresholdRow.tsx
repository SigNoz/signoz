import {
	type DashboardtypesComparisonOperatorDTO,
	type DashboardtypesTableThresholdDTO,
	type DashboardtypesThresholdFormatDTO,
} from 'api/generated/services/sigNoz.schemas';
import { formatPanelValue } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/formatPanelValue';

import type { TableColumnOption } from '../../../../hooks/useTableColumns';
import {
	FORMAT_OPTIONS,
	OPERATOR_OPTIONS,
	OPERATOR_SYMBOL,
} from '../thresholdOptions';
import ThresholdColorField from './shared/ThresholdColorField';
import ThresholdRowShell from './shared/ThresholdRowShell';
import ThresholdSelectField from './shared/ThresholdSelectField';
import ThresholdUnitField from './shared/ThresholdUnitField';
import { useThresholdDraft } from './shared/useThresholdDraft';
import ThresholdValueField from './shared/ThresholdValueField';

import styles from '../ThresholdsSection.module.scss';

interface TableThresholdRowProps {
	index: number;
	threshold: DashboardtypesTableThresholdDTO;
	/** Resolved value columns (with their configured units); the rule targets one. */
	tableColumns: TableColumnOption[];
	isEditing: boolean;
	onEdit: () => void;
	onSave: (next: DashboardtypesTableThresholdDTO) => void;
	onLiveChange: (next: DashboardtypesTableThresholdDTO) => void;
	onDiscard: () => void;
	onRemove: () => void;
}

/**
 * Per-column comparison threshold (Table): value in a column crosses an operator →
 * recolor that column's cells. Edit form is column, condition (operator), value, unit,
 * color, display format. The unit picker scopes to the selected column's unit (Table
 * panels have no single panel-wide unit — V1 parity).
 */
function TableThresholdRow({
	index,
	threshold,
	tableColumns,
	isEditing,
	onEdit,
	onSave,
	onLiveChange,
	onDiscard,
	onRemove,
}: TableThresholdRowProps): JSX.Element {
	const { draft, setDraft, setValue } = useThresholdDraft(
		threshold,
		isEditing,
		onLiveChange,
	);

	// Stored columnName is the query key; resolve its label + configured unit.
	const columnUnit = tableColumns.find((c) => c.key === draft.columnName)?.unit;
	const columnLabel =
		tableColumns.find((c) => c.key === threshold.columnName)?.label ??
		threshold.columnName;
	const columnItems = tableColumns.map((column) => ({
		value: column.key,
		label: column.label,
	}));

	const symbol = threshold.operator ? OPERATOR_SYMBOL[threshold.operator] : '';
	const summary = (
		<>
			<span className={styles.viewLabel}>{columnLabel}</span>
			<span className={styles.viewValue}>
				{symbol} {formatPanelValue(threshold.value, threshold.unit)}
			</span>
		</>
	);

	return (
		<ThresholdRowShell
			index={index}
			testIdPrefix="table-threshold"
			color={threshold.color}
			isEditing={isEditing}
			summary={summary}
			onEdit={onEdit}
			onSave={(): void => onSave(draft)}
			onDiscard={onDiscard}
			onRemove={onRemove}
		>
			<ThresholdSelectField
				label="Column"
				testId={`table-threshold-column-${index}`}
				placeholder="Select column"
				value={draft.columnName || undefined}
				items={columnItems}
				onChange={(columnName): void => setDraft((d) => ({ ...d, columnName }))}
			/>
			<ThresholdSelectField
				label="If value is"
				testId={`table-threshold-operator-${index}`}
				placeholder="Select condition"
				value={draft.operator}
				items={OPERATOR_OPTIONS}
				onChange={(operator): void =>
					setDraft((d) => ({
						...d,
						operator: operator as DashboardtypesComparisonOperatorDTO,
					}))
				}
			/>
			<ThresholdValueField
				testId={`table-threshold-value-${index}`}
				value={draft.value}
				onChange={setValue}
			/>
			<ThresholdUnitField
				testId={`table-threshold-unit-${index}`}
				invalidTestId={`table-threshold-unit-invalid-${index}`}
				value={draft.unit}
				scopeUnit={columnUnit}
				scopeLabel="column unit"
				onChange={(unit): void => setDraft((d) => ({ ...d, unit }))}
			/>
			<ThresholdColorField
				testId={`table-threshold-color-${index}`}
				value={draft.color}
				onChange={(color): void => setDraft((d) => ({ ...d, color }))}
			/>
			<ThresholdSelectField
				label="Display"
				testId={`table-threshold-format-${index}`}
				placeholder="Select display"
				value={draft.format}
				items={FORMAT_OPTIONS}
				onChange={(format): void =>
					setDraft((d) => ({
						...d,
						format: format as DashboardtypesThresholdFormatDTO,
					}))
				}
			/>
		</ThresholdRowShell>
	);
}

export default TableThresholdRow;
