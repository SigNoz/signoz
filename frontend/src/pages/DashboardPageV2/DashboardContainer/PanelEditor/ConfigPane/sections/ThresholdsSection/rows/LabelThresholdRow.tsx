import { Typography } from '@signozhq/ui/typography';
import { Input } from 'antd';
import type { DashboardtypesThresholdWithLabelDTO } from 'api/generated/services/sigNoz.schemas';
import { formatPanelValue } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/formatPanelValue';

import ThresholdColorField from './shared/ThresholdColorField';
import ThresholdRowShell from './shared/ThresholdRowShell';
import ThresholdUnitField from './shared/ThresholdUnitField';
import { useThresholdDraft } from './shared/useThresholdDraft';
import ThresholdValueField from './shared/ThresholdValueField';

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
 * Value + color + label threshold (TimeSeries / Bar): a line drawn on the chart. Edit
 * form is color, value, unit, label.
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
	const { draft, setDraft, setValue } = useThresholdDraft(threshold, isEditing);

	const summary = (
		<>
			<span className={styles.viewValue}>
				{formatPanelValue(threshold.value, threshold.unit)}
			</span>
			{threshold.label && (
				<span className={styles.viewLabel}>{threshold.label}</span>
			)}
		</>
	);

	return (
		<ThresholdRowShell
			index={index}
			testIdPrefix="threshold"
			color={threshold.color}
			isEditing={isEditing}
			summary={summary}
			onEdit={onEdit}
			onSave={(): void => onSave(draft)}
			onDiscard={onDiscard}
			onRemove={onRemove}
		>
			<ThresholdColorField
				testId={`threshold-color-${index}`}
				value={draft.color}
				onChange={(color): void => setDraft((d) => ({ ...d, color }))}
			/>
			<ThresholdValueField
				testId={`threshold-value-${index}`}
				value={draft.value}
				onChange={setValue}
			/>
			<ThresholdUnitField
				testId={`threshold-unit-${index}`}
				invalidTestId={`threshold-unit-invalid-${index}`}
				value={draft.unit}
				scopeUnit={yAxisUnit}
				scopeLabel="y-axis unit"
				onChange={(unit): void => setDraft((d) => ({ ...d, unit }))}
			/>
			<div className={styles.field}>
				<Typography.Text className={styles.fieldLabel}>Label</Typography.Text>
				<Input
					data-testid={`threshold-label-${index}`}
					placeholder="Optional"
					value={draft.label ?? ''}
					onChange={(e): void => setDraft((d) => ({ ...d, label: e.target.value }))}
				/>
			</div>
		</ThresholdRowShell>
	);
}

export default LabelThresholdRow;
