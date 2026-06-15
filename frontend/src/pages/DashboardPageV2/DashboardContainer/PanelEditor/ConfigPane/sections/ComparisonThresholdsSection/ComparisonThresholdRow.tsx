import { type ChangeEvent, useEffect, useState } from 'react';
import { Check, Pencil, Trash2, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';
import type {
	DashboardtypesComparisonOperatorDTO,
	DashboardtypesComparisonThresholdDTO,
	DashboardtypesThresholdFormatDTO,
} from 'api/generated/services/sigNoz.schemas';
import YAxisUnitSelector from 'components/YAxisUnitSelector';
import { YAxisSource } from 'components/YAxisUnitSelector/types';

import ConfigSelect from '../../controls/ConfigSelect/ConfigSelect';
import ThresholdColorSelect from '../ThresholdsSection/ThresholdColorSelect';
import {
	isThresholdUnitIncompatible,
	thresholdUnitCategories,
} from '../ThresholdsSection/thresholdUnitCategories';
import {
	FORMAT_OPTIONS,
	OPERATOR_OPTIONS,
	OPERATOR_SYMBOL,
} from './comparisonThresholdOptions';

import styles from '../ThresholdsSection/ThresholdsSection.module.scss';

interface ComparisonThresholdRowProps {
	index: number;
	threshold: DashboardtypesComparisonThresholdDTO;
	/** Panel formatting unit — scopes the unit picker to its category (V1 parity). */
	yAxisUnit?: string;
	isEditing: boolean;
	onEdit: () => void;
	onSave: (next: DashboardtypesComparisonThresholdDTO) => void;
	onDiscard: () => void;
	onRemove: () => void;
}

/**
 * One Number-panel comparison threshold ("If value > 80 → red") with V1-style
 * view/edit modes. View mode is a compact summary (color · operator value+unit ·
 * display); edit mode is a labelled form — condition (operator), value, unit (scoped to
 * the y-axis unit's category), color, and display (text/background) — editing a local
 * draft committed only on Save. Discard drops it.
 */
function ComparisonThresholdRow({
	index,
	threshold,
	yAxisUnit,
	isEditing,
	onEdit,
	onSave,
	onDiscard,
	onRemove,
}: ComparisonThresholdRowProps): JSX.Element {
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
		const symbol = threshold.operator ? OPERATOR_SYMBOL[threshold.operator] : '';
		return (
			<div className={styles.viewRow}>
				<span className={styles.dot} style={{ backgroundColor: threshold.color }} />
				<span className={styles.viewValue}>
					{symbol} {threshold.value}
					{threshold.unit ? ` ${threshold.unit}` : ''}
				</span>
				<div className={styles.spacer} />
				<Button
					type="button"
					variant="ghost"
					color="secondary"
					size="icon"
					aria-label={`Edit threshold ${index + 1}`}
					data-testid={`comparison-threshold-edit-${index}`}
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
					data-testid={`comparison-threshold-remove-${index}`}
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
				<Typography.Text className={styles.fieldLabel}>If value is</Typography.Text>
				<ConfigSelect
					testId={`comparison-threshold-operator-${index}`}
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
					testId={`comparison-threshold-value-${index}`}
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
					data-testid={`comparison-threshold-unit-${index}`}
					placeholder="Select unit"
					source={YAxisSource.DASHBOARDS}
					categoriesOverride={thresholdUnitCategories(yAxisUnit)}
					value={draft.unit}
					onChange={(unit): void => setDraft((d) => ({ ...d, unit }))}
				/>
				{isThresholdUnitIncompatible(draft.unit, yAxisUnit) && (
					<Typography.Text
						className={styles.invalidUnit}
						data-testid={`comparison-threshold-unit-invalid-${index}`}
					>
						Threshold unit ({draft.unit}) is not valid with the y-axis unit (
						{yAxisUnit})
					</Typography.Text>
				)}
			</div>

			<div className={styles.field}>
				<Typography.Text className={styles.fieldLabel}>Color</Typography.Text>
				<ThresholdColorSelect
					value={draft.color}
					testId={`comparison-threshold-color-${index}`}
					onChange={(color): void => setDraft((d) => ({ ...d, color }))}
				/>
			</div>

			<div className={styles.field}>
				<Typography.Text className={styles.fieldLabel}>Display</Typography.Text>
				<ConfigSelect
					testId={`comparison-threshold-format-${index}`}
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
					data-testid={`comparison-threshold-discard-${index}`}
					onClick={onDiscard}
				>
					Discard
				</Button>
				<Button
					type="button"
					variant="solid"
					color="primary"
					prefix={<Check size={14} />}
					data-testid={`comparison-threshold-save-${index}`}
					onClick={(): void => onSave(draft)}
				>
					Save
				</Button>
			</div>
		</div>
	);
}

export default ComparisonThresholdRow;
