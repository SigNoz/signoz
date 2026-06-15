import { useState } from 'react';
import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import {
	DashboardtypesComparisonOperatorDTO,
	type DashboardtypesComparisonThresholdDTO,
	DashboardtypesThresholdFormatDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { SectionEditorProps } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';

import ComparisonThresholdRow from './ComparisonThresholdRow';

import styles from '../ThresholdsSection/ThresholdsSection.module.scss';

// New thresholds default to red (the first palette preset); the user recolors per rule.
const DEFAULT_THRESHOLD_COLOR = '#F1575F';

type ComparisonThresholdsSectionProps =
	SectionEditorProps<'comparisonThresholds'> & {
		/** Panel formatting unit; scopes each row's unit picker to its category (V1 parity). */
		yAxisUnit?: string;
	};

/**
 * Edits the Number panel's `thresholds` slice — a list of comparison rules (value
 * crosses an operator → recolor the displayed number), each with V1-style view/edit
 * modes. Only one row edits at a time; a freshly-added row opens in edit mode and is
 * removed if discarded before saving. TimeSeries/Bar use the value+label `ThresholdsSection`.
 */
function ComparisonThresholdsSection({
	value,
	onChange,
	yAxisUnit,
}: ComparisonThresholdsSectionProps): JSX.Element {
	const thresholds = value ?? [];
	// Which row is being edited, and whether it was just added (so Discard removes it).
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [unsavedIndex, setUnsavedIndex] = useState<number | null>(null);

	const addThreshold = (): void => {
		const nextIndex = thresholds.length;
		onChange([
			...thresholds,
			{
				value: 0,
				color: DEFAULT_THRESHOLD_COLOR,
				operator: DashboardtypesComparisonOperatorDTO.above,
				format: DashboardtypesThresholdFormatDTO.text,
			},
		]);
		setEditingIndex(nextIndex);
		setUnsavedIndex(nextIndex);
	};

	const saveAt =
		(index: number) =>
		(next: DashboardtypesComparisonThresholdDTO): void => {
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

	return (
		<div className={styles.list}>
			{thresholds.map((threshold, index) => (
				<ComparisonThresholdRow
					// Thresholds have no stable id on the wire; index is the row identity.
					// eslint-disable-next-line react/no-array-index-key
					key={index}
					index={index}
					threshold={threshold}
					yAxisUnit={yAxisUnit}
					isEditing={editingIndex === index}
					onEdit={(): void => setEditingIndex(index)}
					onSave={saveAt(index)}
					onDiscard={discardAt(index)}
					onRemove={(): void => removeAt(index)}
				/>
			))}

			<Button
				type="button"
				variant="dashed"
				color="secondary"
				prefix={<Plus size={14} />}
				data-testid="panel-editor-v2-add-comparison-threshold"
				onClick={addThreshold}
			>
				Add threshold
			</Button>
		</div>
	);
}

export default ComparisonThresholdsSection;
