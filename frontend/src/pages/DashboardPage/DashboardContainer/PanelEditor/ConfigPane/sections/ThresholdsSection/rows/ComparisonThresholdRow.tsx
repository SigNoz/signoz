import type { DashboardtypesComparisonThresholdDTO } from 'api/generated/services/sigNoz.schemas';
import { formatPanelValue } from 'pages/DashboardPage/DashboardContainer/Panels/utils/formatPanelValue';

import { describeThresholdPaint, OPERATOR_SYMBOL } from '../thresholdOptions';
import ThresholdAmountField from './shared/ThresholdAmountField';
import ThresholdColorField from './shared/ThresholdColorField';
import ThresholdFormatField from './shared/ThresholdFormatField';
import ThresholdMarker from './shared/ThresholdMarker';
import ThresholdOperatorField from './shared/ThresholdOperatorField';
import ThresholdRowShell from './shared/ThresholdRowShell';
import { useThresholdDraft } from './shared/useThresholdDraft';

interface ComparisonThresholdRowProps {
	index: number;
	threshold: DashboardtypesComparisonThresholdDTO;
	/** Panel formatting unit — scopes the unit picker to its category (V1 parity). */
	yAxisUnit?: string;
	isEditing: boolean;
	isNew: boolean;
	onEdit: () => void;
	onSave: (next: DashboardtypesComparisonThresholdDTO) => void;
	onLiveChange: (next: DashboardtypesComparisonThresholdDTO) => void;
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
	isNew,
	onEdit,
	onSave,
	onLiveChange,
	onDiscard,
	onRemove,
}: ComparisonThresholdRowProps): JSX.Element {
	const { draft, setDraft, setValue } = useThresholdDraft(
		threshold,
		isEditing,
		onLiveChange,
	);

	const symbol = threshold.operator ? OPERATOR_SYMBOL[threshold.operator] : '';

	return (
		<ThresholdRowShell
			index={index}
			testIdPrefix="comparison-threshold"
			marker={
				<ThresholdMarker
					kind="format"
					color={threshold.color}
					format={threshold.format}
				/>
			}
			isEditing={isEditing}
			isNew={isNew}
			title={`${symbol} ${formatPanelValue(threshold.value, threshold.unit)}`}
			subtitle={describeThresholdPaint(threshold.color, threshold.format)}
			onEdit={onEdit}
			onSave={(): void => onSave(draft)}
			onDiscard={onDiscard}
			onRemove={onRemove}
		>
			<ThresholdOperatorField
				testId={`comparison-threshold-operator-${index}`}
				value={draft.operator}
				onChange={(operator): void => setDraft((d) => ({ ...d, operator }))}
			/>
			<ThresholdAmountField
				label="Value"
				testIdPrefix="comparison-threshold"
				index={index}
				value={draft.value}
				onValueChange={setValue}
				unit={draft.unit}
				scopeUnit={yAxisUnit}
				scopeLabel="y-axis unit"
				onUnitChange={(unit): void => setDraft((d) => ({ ...d, unit }))}
			/>
			<ThresholdColorField
				testId={`comparison-threshold-color-${index}`}
				value={draft.color}
				onChange={(color): void => setDraft((d) => ({ ...d, color }))}
			/>
			<ThresholdFormatField
				testId={`comparison-threshold-format-${index}`}
				value={draft.format}
				color={draft.color}
				onChange={(format): void => setDraft((d) => ({ ...d, format }))}
			/>
		</ThresholdRowShell>
	);
}

export default ComparisonThresholdRow;
