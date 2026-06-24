import { useState } from 'react';
import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import {
	DashboardtypesComparisonOperatorDTO,
	type DashboardtypesComparisonThresholdDTO,
	type DashboardtypesTableThresholdDTO,
	DashboardtypesThresholdFormatDTO,
	type DashboardtypesThresholdWithLabelDTO,
} from 'api/generated/services/sigNoz.schemas';
import type {
	AnyThreshold,
	ThresholdVariant,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';

import type { TableColumnOption } from '../../../hooks/useTableColumns';
import ComparisonThresholdRow from './rows/ComparisonThresholdRow';
import LabelThresholdRow from './rows/LabelThresholdRow';
import TableThresholdRow from './rows/TableThresholdRow';

import styles from './ThresholdsSection.module.scss';

// New thresholds default to red (the first palette preset); the user recolors per rule.
const DEFAULT_THRESHOLD_COLOR = '#F1575F';

// Add-button testId per variant — kept stable so existing E2E/unit selectors hold.
const ADD_TESTID: Record<ThresholdVariant, string> = {
	label: 'panel-editor-v2-add-threshold',
	comparison: 'panel-editor-v2-add-comparison-threshold',
	table: 'panel-editor-v2-add-table-threshold',
};

// Seed for a freshly-added row, in the shape the variant's editor + spec expect.
function defaultThreshold(
	variant: ThresholdVariant,
	tableColumns: TableColumnOption[],
): AnyThreshold {
	switch (variant) {
		case 'comparison':
			return {
				value: 0,
				color: DEFAULT_THRESHOLD_COLOR,
				operator: DashboardtypesComparisonOperatorDTO.above,
				format: DashboardtypesThresholdFormatDTO.text,
			};
		case 'table':
			return {
				columnName: tableColumns[0]?.key ?? '',
				value: 0,
				color: DEFAULT_THRESHOLD_COLOR,
				operator: DashboardtypesComparisonOperatorDTO.above,
				format: DashboardtypesThresholdFormatDTO.background,
			};
		default:
			return { value: 0, color: DEFAULT_THRESHOLD_COLOR, label: '' };
	}
}

type ThresholdsSectionProps = {
	value: AnyThreshold[] | undefined;
	/** `variant` picks the row editor + element shape; defaults to `label`. */
	controls?: { variant?: ThresholdVariant };
	onChange: (next: AnyThreshold[]) => void;
	/** Panel formatting unit; scopes each row's unit picker to its category (V1 parity). */
	yAxisUnit?: string;
	/** Table panel's resolved value columns (table variant only). */
	tableColumns?: TableColumnOption[];
};

/**
 * Edits the `thresholds` slice for every panel kind. All variants share the same
 * list mechanics (one row edits at a time; a freshly-added row opens in edit mode and
 * is removed if discarded before saving) and differ only in the row editor, picked by
 * `controls.variant`: `label` (TimeSeries/Bar), `comparison` (Number), `table` (Table).
 */
function ThresholdsSection({
	value,
	controls,
	onChange,
	yAxisUnit,
	tableColumns = [],
}: ThresholdsSectionProps): JSX.Element {
	const variant = controls?.variant ?? 'label';
	const thresholds = value ?? [];
	// Which row is being edited, and whether it was just added (so Discard removes it).
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [unsavedIndex, setUnsavedIndex] = useState<number | null>(null);

	const addThreshold = (): void => {
		const nextIndex = thresholds.length;
		onChange([...thresholds, defaultThreshold(variant, tableColumns)]);
		setEditingIndex(nextIndex);
		setUnsavedIndex(nextIndex);
	};

	const saveAt =
		(index: number) =>
		(next: AnyThreshold): void => {
			onChange(thresholds.map((t, i) => (i === index ? next : t)));
			setEditingIndex(null);
			setUnsavedIndex(null);
		};

	const removeAt = (index: number): void => {
		onChange(thresholds.filter((_, i) => i !== index));
		setEditingIndex(null);
		setUnsavedIndex(null);
	};

	const discardAt = (index: number) => (): void => {
		// Discarding a row that was never saved removes it; otherwise just exit edit.
		if (index === unsavedIndex) {
			removeAt(index);
			return;
		}
		setEditingIndex(null);
	};

	const renderRow = (threshold: AnyThreshold, index: number): JSX.Element => {
		// Shared row controls; the threshold value is narrowed per variant at this
		// branch boundary — the slice only ever holds the active variant's shape.
		const common = {
			index,
			yAxisUnit,
			isEditing: editingIndex === index,
			onEdit: (): void => setEditingIndex(index),
			onSave: saveAt(index),
			onDiscard: discardAt(index),
			onRemove: (): void => removeAt(index),
		};

		if (variant === 'comparison') {
			return (
				<ComparisonThresholdRow
					// eslint-disable-next-line react/no-array-index-key
					key={index}
					threshold={threshold as DashboardtypesComparisonThresholdDTO}
					{...common}
				/>
			);
		}
		if (variant === 'table') {
			return (
				<TableThresholdRow
					// eslint-disable-next-line react/no-array-index-key
					key={index}
					threshold={threshold as DashboardtypesTableThresholdDTO}
					tableColumns={tableColumns}
					{...common}
				/>
			);
		}
		return (
			<LabelThresholdRow
				// eslint-disable-next-line react/no-array-index-key
				key={index}
				threshold={threshold as DashboardtypesThresholdWithLabelDTO}
				{...common}
			/>
		);
	};

	return (
		<div className={styles.list}>
			{thresholds.map(renderRow)}

			<Button
				type="button"
				variant="dashed"
				color="secondary"
				prefix={<Plus size={14} />}
				data-testid={ADD_TESTID[variant]}
				onClick={addThreshold}
			>
				Add threshold
			</Button>
		</div>
	);
}

export default ThresholdsSection;
