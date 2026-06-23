import {
	type DashboardtypesComparisonOperatorDTO,
	type DashboardtypesComparisonThresholdDTO,
	type DashboardtypesThresholdFormatDTO,
} from 'api/generated/services/sigNoz.schemas';
import { formatPanelValue } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/formatPanelValue';

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
 * Comparison threshold (Number): value crosses an operator → recolor. Edit form is
 * condition (operator), value, unit, color, display format.
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
	const { draft, setDraft, setValue } = useThresholdDraft(threshold, isEditing);

	const symbol = threshold.operator ? OPERATOR_SYMBOL[threshold.operator] : '';
	const summary = (
		<span className={styles.viewValue}>
			{symbol} {formatPanelValue(threshold.value, threshold.unit)}
		</span>
	);

	return (
		<ThresholdRowShell
			index={index}
			testIdPrefix="comparison-threshold"
			color={threshold.color}
			isEditing={isEditing}
			summary={summary}
			onEdit={onEdit}
			onSave={(): void => onSave(draft)}
			onDiscard={onDiscard}
			onRemove={onRemove}
		>
			<ThresholdSelectField
				label="If value is"
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
			<ThresholdValueField
				testId={`comparison-threshold-value-${index}`}
				value={draft.value}
				onChange={setValue}
			/>
			<ThresholdUnitField
				testId={`comparison-threshold-unit-${index}`}
				invalidTestId={`comparison-threshold-unit-invalid-${index}`}
				value={draft.unit}
				scopeUnit={yAxisUnit}
				scopeLabel="y-axis unit"
				onChange={(unit): void => setDraft((d) => ({ ...d, unit }))}
			/>
			<ThresholdColorField
				testId={`comparison-threshold-color-${index}`}
				value={draft.color}
				onChange={(color): void => setDraft((d) => ({ ...d, color }))}
			/>
			<ThresholdSelectField
				label="Display"
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
		</ThresholdRowShell>
	);
}

export default ComparisonThresholdRow;
