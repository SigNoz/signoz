import type { DashboardtypesTableThresholdDTO } from 'api/generated/services/sigNoz.schemas';
import { getUniversalNameFromMetricUnit } from 'components/YAxisUnitSelector/utils';
import { formatPanelValue } from 'pages/DashboardPage/DashboardContainer/Panels/utils/formatPanelValue';

import type { TableColumnOption } from '../../../../hooks/useTableColumns';
import { describeThresholdPaint, OPERATOR_SYMBOL } from '../thresholdOptions';
import ThresholdAmountField from './shared/ThresholdAmountField';
import ThresholdColorField from './shared/ThresholdColorField';
import ThresholdFormatField from './shared/ThresholdFormatField';
import ThresholdMarker from './shared/ThresholdMarker';
import ThresholdOperatorField from './shared/ThresholdOperatorField';
import ThresholdRowShell from './shared/ThresholdRowShell';
import ThresholdSelectField from './shared/ThresholdSelectField';
import { useThresholdDraft } from './shared/useThresholdDraft';

interface TableThresholdRowProps {
	index: number;
	threshold: DashboardtypesTableThresholdDTO;
	/** Resolved value columns (with their configured units); the rule targets one. */
	tableColumns: TableColumnOption[];
	isEditing: boolean;
	isNew: boolean;
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
	isNew,
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
		label: column.unit
			? `${column.label} · ${getUniversalNameFromMetricUnit(column.unit)}`
			: column.label,
	}));

	const symbol = threshold.operator ? OPERATOR_SYMBOL[threshold.operator] : '';
	const paint = describeThresholdPaint(threshold.color, threshold.format);

	return (
		<ThresholdRowShell
			index={index}
			testIdPrefix="table-threshold"
			marker={
				<ThresholdMarker
					kind="format"
					color={threshold.color}
					format={threshold.format}
				/>
			}
			isEditing={isEditing}
			isNew={isNew}
			title={`${threshold.columnName} ${symbol} ${formatPanelValue(
				threshold.value,
				threshold.unit,
			)}`}
			subtitle={columnLabel ? `${paint} · ${columnLabel}` : paint}
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
			<ThresholdOperatorField
				testId={`table-threshold-operator-${index}`}
				value={draft.operator}
				onChange={(operator): void => setDraft((d) => ({ ...d, operator }))}
			/>
			<ThresholdAmountField
				label="Value"
				testIdPrefix="table-threshold"
				index={index}
				value={draft.value}
				onValueChange={setValue}
				unit={draft.unit}
				scopeUnit={columnUnit}
				scopeLabel="column unit"
				onUnitChange={(unit): void => setDraft((d) => ({ ...d, unit }))}
			/>
			<ThresholdColorField
				testId={`table-threshold-color-${index}`}
				value={draft.color}
				onChange={(color): void => setDraft((d) => ({ ...d, color }))}
			/>
			<ThresholdFormatField
				testId={`table-threshold-format-${index}`}
				value={draft.format}
				color={draft.color}
				onChange={(format): void => setDraft((d) => ({ ...d, format }))}
			/>
		</ThresholdRowShell>
	);
}

export default TableThresholdRow;
