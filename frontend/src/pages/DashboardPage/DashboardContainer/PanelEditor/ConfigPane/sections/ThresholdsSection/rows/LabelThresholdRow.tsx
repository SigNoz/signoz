import { useCallback } from 'react';
import { Typography } from '@signozhq/ui/typography';
import { Input } from 'antd';
import type { DashboardtypesThresholdWithLabelDTO } from 'api/generated/services/sigNoz.schemas';
import { formatPanelValue } from 'pages/DashboardPage/DashboardContainer/Panels/utils/formatPanelValue';

import ThresholdAmountField from './shared/ThresholdAmountField';
import ThresholdColorField from './shared/ThresholdColorField';
import ThresholdMarker from './shared/ThresholdMarker';
import ThresholdRowShell from './shared/ThresholdRowShell';
import { useThresholdDraft } from './shared/useThresholdDraft';

import styles from '../ThresholdsSection.module.scss';

interface LabelThresholdRowProps {
	index: number;
	threshold: DashboardtypesThresholdWithLabelDTO;
	/** Panel formatting unit — scopes the unit picker to its category (V1 parity). */
	yAxisUnit?: string;
	isEditing: boolean;
	isNew: boolean;
	onEdit: () => void;
	onSave: (next: DashboardtypesThresholdWithLabelDTO) => void;
	onLiveChange: (next: DashboardtypesThresholdWithLabelDTO) => void;
	onDiscard: () => void;
	onRemove: () => void;
}

/** Value + color + label threshold (TimeSeries / Bar): a line drawn on the chart. */
function LabelThresholdRow({
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
}: LabelThresholdRowProps): JSX.Element {
	const { draft, setDraft, setValue } = useThresholdDraft(
		threshold,
		isEditing,
		onLiveChange,
	);

	// Persist an empty-string label when none was entered — the spec requires a string.
	const handleSave = useCallback((): void => {
		onSave({ ...draft, label: draft.label ?? '' });
	}, [onSave, draft]);

	return (
		<ThresholdRowShell
			index={index}
			testIdPrefix="threshold"
			marker={<ThresholdMarker kind="line" color={threshold.color} />}
			isEditing={isEditing}
			isNew={isNew}
			title={`Line at ${formatPanelValue(threshold.value, threshold.unit)}`}
			subtitle={threshold.label}
			onEdit={onEdit}
			onSave={handleSave}
			onDiscard={onDiscard}
			onRemove={onRemove}
		>
			<ThresholdAmountField
				label="Draw a line at"
				testIdPrefix="threshold"
				index={index}
				value={draft.value}
				onValueChange={setValue}
				unit={draft.unit}
				scopeUnit={yAxisUnit}
				scopeLabel="y-axis unit"
				onUnitChange={(unit): void => setDraft((d) => ({ ...d, unit }))}
			/>
			<ThresholdColorField
				testId={`threshold-color-${index}`}
				value={draft.color}
				onChange={(color): void => setDraft((d) => ({ ...d, color }))}
			/>
			<div className={styles.field}>
				<Typography.Text className={styles.fieldLabel}>
					Label <span className={styles.optional}>· optional</span>
				</Typography.Text>
				<Input
					data-testid={`threshold-label-${index}`}
					aria-label="Label"
					placeholder="e.g. SLO breach"
					value={draft.label ?? ''}
					onChange={(e): void => setDraft((d) => ({ ...d, label: e.target.value }))}
				/>
			</div>
		</ThresholdRowShell>
	);
}

export default LabelThresholdRow;
