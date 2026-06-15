import { type ChangeEvent, useEffect, useState } from 'react';
import { Check, Pencil, Trash2, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { Input } from 'antd';
import type { DashboardtypesThresholdWithLabelDTO } from 'api/generated/services/sigNoz.schemas';
import YAxisUnitSelector from 'components/YAxisUnitSelector';
import { YAxisSource } from 'components/YAxisUnitSelector/types';
import { formatPanelValue } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/formatPanelValue';

import ThresholdColorSelect from '../ThresholdColorSelect';
import {
	isThresholdUnitIncompatible,
	thresholdUnitCategories,
} from '../thresholdUnitCategories';

import styles from '../ThresholdsSection.module.scss';

interface LabelThresholdRowProps {
	index: number;
	threshold: DashboardtypesThresholdWithLabelDTO;
	/** Panel formatting unit — scopes the unit picker to its category (V1 parity). */
	yAxisUnit?: string;
	isEditing: boolean;
	onEdit: () => void;
	onSave: (next: DashboardtypesThresholdWithLabelDTO) => void;
	onDiscard: () => void;
	onRemove: () => void;
}

/**
 * One threshold rule with V1-style view/edit modes. View mode shows a compact summary
 * (color · value+unit · label) with Edit + Delete. Edit mode is a labelled form — color
 * (preset/custom), value, unit (scoped to the y-axis unit's category), label — editing a
 * local draft that's only committed on Save; Discard drops it.
 */
function LabelThresholdRow({
	index,
	threshold,
	yAxisUnit,
	isEditing,
	onEdit,
	onSave,
	onDiscard,
	onRemove,
}: LabelThresholdRowProps): JSX.Element {
	const [draft, setDraft] = useState(threshold);

	// Snapshot the saved threshold into the draft each time we (re)enter edit mode, so
	// Discard simply drops the draft and the next edit starts clean.
	useEffect(() => {
		if (isEditing) {
			setDraft(threshold);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot only on edit entry
	}, [isEditing]);

	if (!isEditing) {
		return (
			<div className={styles.viewRow}>
				<span className={styles.dot} style={{ backgroundColor: threshold.color }} />
				<span className={styles.viewValue}>
					{formatPanelValue(threshold.value, threshold.unit)}
				</span>
				{threshold.label && (
					<span className={styles.viewLabel}>{threshold.label}</span>
				)}
				<div className={styles.spacer} />
				<Button
					type="button"
					variant="ghost"
					color="secondary"
					size="icon"
					aria-label={`Edit threshold ${index + 1}`}
					data-testid={`threshold-edit-${index}`}
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
					data-testid={`threshold-remove-${index}`}
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

	return (
		<div className={styles.editRow}>
			<div className={styles.field}>
				<Typography.Text className={styles.fieldLabel}>Color</Typography.Text>
				<ThresholdColorSelect
					value={draft.color}
					testId={`threshold-color-${index}`}
					onChange={(color): void => setDraft((d) => ({ ...d, color }))}
				/>
			</div>

			<div className={styles.field}>
				<Typography.Text className={styles.fieldLabel}>Value</Typography.Text>
				<Input
					data-testid={`threshold-value-${index}`}
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
					data-testid={`threshold-unit-${index}`}
					placeholder="Select unit"
					source={YAxisSource.DASHBOARDS}
					categoriesOverride={thresholdUnitCategories(yAxisUnit)}
					value={draft.unit}
					onChange={(unit): void => setDraft((d) => ({ ...d, unit }))}
				/>
				{isThresholdUnitIncompatible(draft.unit, yAxisUnit) && (
					<Typography.Text
						className={styles.invalidUnit}
						data-testid={`threshold-unit-invalid-${index}`}
					>
						Threshold unit ({draft.unit}) is not valid with the y-axis unit (
						{yAxisUnit})
					</Typography.Text>
				)}
			</div>

			<div className={styles.field}>
				<Typography.Text className={styles.fieldLabel}>Label</Typography.Text>
				<Input
					data-testid={`threshold-label-${index}`}
					placeholder="Optional"
					value={draft.label ?? ''}
					onChange={(e): void => setDraft((d) => ({ ...d, label: e.target.value }))}
				/>
			</div>

			<div className={styles.actions}>
				<Button
					type="button"
					variant="outlined"
					color="secondary"
					prefix={<X size={14} />}
					data-testid={`threshold-discard-${index}`}
					onClick={onDiscard}
				>
					Discard
				</Button>
				<Button
					type="button"
					variant="solid"
					color="primary"
					prefix={<Check size={14} />}
					data-testid={`threshold-save-${index}`}
					onClick={(): void => onSave(draft)}
				>
					Save
				</Button>
			</div>
		</div>
	);
}

export default LabelThresholdRow;
