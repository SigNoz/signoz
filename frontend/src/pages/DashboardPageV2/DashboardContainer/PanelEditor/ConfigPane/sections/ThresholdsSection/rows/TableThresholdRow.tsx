import { type ChangeEvent, useEffect, useState } from 'react';
import { Check, Pencil, Trash2, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import {
	type DashboardtypesComparisonOperatorDTO,
	type DashboardtypesTableThresholdDTO,
	type DashboardtypesThresholdFormatDTO,
} from 'api/generated/services/sigNoz.schemas';
import { Input } from 'antd';
import YAxisUnitSelector from 'components/YAxisUnitSelector';
import { YAxisSource } from 'components/YAxisUnitSelector/types';
import { formatPanelValue } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/formatPanelValue';

import type { TableColumnOption } from '../../../../hooks/useTableColumns';
import ConfigSelect from '../../../controls/ConfigSelect/ConfigSelect';
import {
	FORMAT_OPTIONS,
	OPERATOR_OPTIONS,
	OPERATOR_SYMBOL,
} from '../thresholdOptions';
import ThresholdColorSelect from '../ThresholdColorSelect';
import {
	isThresholdUnitIncompatible,
	thresholdUnitCategories,
} from '../thresholdUnitCategories';

import styles from '../ThresholdsSection.module.scss';

interface TableThresholdRowProps {
	index: number;
	threshold: DashboardtypesTableThresholdDTO;
	/** Resolved value columns (with their configured units); the rule targets one. */
	tableColumns: TableColumnOption[];
	/**
	 * Forwarded by the shared section but unused here: Table thresholds scope to the
	 * selected column's unit, not a panel-wide one. Kept so the common props spread
	 * type-checks across every variant row.
	 */
	yAxisUnit?: string;
	isEditing: boolean;
	onEdit: () => void;
	onSave: (next: DashboardtypesTableThresholdDTO) => void;
	onDiscard: () => void;
	onRemove: () => void;
}

/**
 * One Table-panel threshold ("If <column> > 80 → red") with V1-style view/edit
 * modes. View mode is a compact summary (color · column · operator value+unit); edit
 * mode is a labelled form — column, condition (operator), value, unit (scoped to the
 * y-axis unit's category), color, and display (text/background) — editing a local
 * draft committed only on Save. Discard drops it.
 */
function TableThresholdRow({
	index,
	threshold,
	tableColumns,
	isEditing,
	onEdit,
	onSave,
	onDiscard,
	onRemove,
}: TableThresholdRowProps): JSX.Element {
	const [draft, setDraft] = useState(threshold);

	// Snapshot the saved threshold into the draft each time we (re)enter edit mode, so
	// Discard simply drops the draft and the next edit starts clean.
	useEffect(() => {
		if (isEditing) {
			setDraft(threshold);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot only on edit entry
	}, [isEditing]);

	// Stored columnName is the query key; resolve its label + configured unit. The
	// threshold's unit picker scopes to the selected column's unit category (Table
	// panels have no single panel-wide unit — V1 parity).
	const selectedColumn = tableColumns.find(
		(column) => column.key === draft.columnName,
	);
	const columnLabel =
		tableColumns.find((column) => column.key === threshold.columnName)?.label ??
		threshold.columnName;
	const columnUnit = selectedColumn?.unit;

	if (!isEditing) {
		const symbol = threshold.operator ? OPERATOR_SYMBOL[threshold.operator] : '';
		return (
			<div className={styles.viewRow}>
				<span className={styles.dot} style={{ backgroundColor: threshold.color }} />
				<span className={styles.viewLabel}>{columnLabel}</span>
				<span className={styles.viewValue}>
					{symbol} {formatPanelValue(threshold.value, threshold.unit)}
				</span>
				<div className={styles.spacer} />
				<Button
					type="button"
					variant="ghost"
					color="secondary"
					size="icon"
					aria-label={`Edit threshold ${index + 1}`}
					data-testid={`table-threshold-edit-${index}`}
					onClick={onEdit}
				>
					<Pencil size={14} />
				</Button>
				<Button
					type="button"
					variant="ghost"
					color="destructive"
					size="icon"
					aria-label={`Remove threshold ${index + 1}`}
					data-testid={`table-threshold-remove-${index}`}
					onClick={onRemove}
				>
					<Trash2 size={14} />
				</Button>
			</div>
		);
	}

	const handleValue = (e: ChangeEvent<HTMLInputElement>): void => {
		const next = Number(e.target.value);
		setDraft((d) => ({ ...d, value: Number.isNaN(next) ? d.value : next }));
	};

	const columnItems = tableColumns.map((column) => ({
		value: column.key,
		label: column.label,
	}));

	return (
		<div className={styles.editRow}>
			<div className={styles.field}>
				<Typography.Text className={styles.fieldLabel}>Column</Typography.Text>
				<ConfigSelect
					testId={`table-threshold-column-${index}`}
					placeholder="Select column"
					value={draft.columnName || undefined}
					items={columnItems}
					onChange={(columnName): void => setDraft((d) => ({ ...d, columnName }))}
				/>
			</div>

			<div className={styles.field}>
				<Typography.Text className={styles.fieldLabel}>If value is</Typography.Text>
				<ConfigSelect
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
			</div>

			<div className={styles.field}>
				<Typography.Text className={styles.fieldLabel}>Value</Typography.Text>
				<Input
					data-testid={`table-threshold-value-${index}`}
					type="number"
					placeholder="Value"
					value={draft.value}
					onChange={handleValue}
				/>
			</div>

			<div className={styles.field}>
				<Typography.Text className={styles.fieldLabel}>Unit</Typography.Text>
				<YAxisUnitSelector
					containerClassName={styles.unitSelector}
					data-testid={`table-threshold-unit-${index}`}
					placeholder="Select unit"
					source={YAxisSource.DASHBOARDS}
					categoriesOverride={thresholdUnitCategories(columnUnit)}
					value={draft.unit}
					onChange={(unit): void => setDraft((d) => ({ ...d, unit }))}
				/>
				{isThresholdUnitIncompatible(draft.unit, columnUnit) && (
					<Typography.Text
						className={styles.invalidUnit}
						data-testid={`table-threshold-unit-invalid-${index}`}
					>
						Threshold unit ({draft.unit}) is not valid with the column unit (
						{columnUnit})
					</Typography.Text>
				)}
			</div>

			<div className={styles.field}>
				<Typography.Text className={styles.fieldLabel}>Color</Typography.Text>
				<ThresholdColorSelect
					value={draft.color}
					testId={`table-threshold-color-${index}`}
					onChange={(color): void => setDraft((d) => ({ ...d, color }))}
				/>
			</div>

			<div className={styles.field}>
				<Typography.Text className={styles.fieldLabel}>Display</Typography.Text>
				<ConfigSelect
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
			</div>

			<div className={styles.actions}>
				<Button
					type="button"
					variant="outlined"
					color="secondary"
					prefix={<X size={14} />}
					data-testid={`table-threshold-discard-${index}`}
					onClick={onDiscard}
				>
					Discard
				</Button>
				<Button
					type="button"
					variant="solid"
					color="primary"
					prefix={<Check size={14} />}
					data-testid={`table-threshold-save-${index}`}
					onClick={(): void => onSave(draft)}
				>
					Save
				</Button>
			</div>
		</div>
	);
}

export default TableThresholdRow;
