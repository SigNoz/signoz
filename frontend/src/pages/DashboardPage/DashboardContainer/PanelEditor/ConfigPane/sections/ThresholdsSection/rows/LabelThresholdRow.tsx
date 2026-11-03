import { useCallback } from 'react';
import { Typography } from '@signozhq/ui/typography';
import { Input } from 'antd';
import {
	type DashboardtypesScatterPlotThresholdDTO,
	DashboardtypesThresholdAxisDTO,
} from 'api/generated/services/sigNoz.schemas';
import { formatPanelValue } from 'pages/DashboardPage/DashboardContainer/Panels/utils/formatPanelValue';

import ThresholdAmountField from './shared/ThresholdAmountField';
import ThresholdAxisField from './shared/ThresholdAxisField';
import ThresholdColorField from './shared/ThresholdColorField';
import ThresholdMarker from './shared/ThresholdMarker';
import ThresholdRowShell from './shared/ThresholdRowShell';
import { useThresholdDraft } from './shared/useThresholdDraft';

import styles from '../ThresholdsSection.module.scss';

/** `axis` is set only where the row picks one (Scatter Plot). */
type LabelThreshold = DashboardtypesScatterPlotThresholdDTO;

interface LabelThresholdRowProps {
	index: number;
	threshold: LabelThreshold;
	/** Panel formatting unit — scopes the unit picker to its category (V1 parity). */
	yAxisUnit?: string;
	/** Shows the axis picker; the unit picker then scopes to the picked axis's unit. */
	showAxis?: boolean;
	axisUnits?: { x?: string; y?: string };
	isEditing: boolean;
	isNew: boolean;
	onEdit: () => void;
	onSave: (next: LabelThreshold) => void;
	onLiveChange: (next: LabelThreshold) => void;
	onDiscard: () => void;
	onRemove: () => void;
}

/** Value + color + label threshold (TimeSeries / Bar): a line drawn on the chart. */
function LabelThresholdRow({
	index,
	threshold,
	yAxisUnit,
	showAxis,
	axisUnits,
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

	const draftAxis = draft.axis ?? DashboardtypesThresholdAxisDTO.y;
	const scopeUnit = showAxis ? axisUnits?.[draftAxis] : yAxisUnit;
	const subtitle = showAxis
		? [
				`${(threshold.axis ?? DashboardtypesThresholdAxisDTO.y).toUpperCase()} axis`,
				threshold.label,
			]
				.filter(Boolean)
				.join(' · ')
		: threshold.label;

	return (
		<ThresholdRowShell
			index={index}
			testIdPrefix="threshold"
			marker={<ThresholdMarker kind="line" color={threshold.color} />}
			isEditing={isEditing}
			isNew={isNew}
			title={`Line at ${formatPanelValue(threshold.value, threshold.unit)}`}
			subtitle={subtitle}
			onEdit={onEdit}
			onSave={handleSave}
			onDiscard={onDiscard}
			onRemove={onRemove}
		>
			{showAxis && (
				<ThresholdAxisField
					testId={`threshold-axis-${index}`}
					value={draftAxis}
					onChange={(axis): void => setDraft((d) => ({ ...d, axis }))}
				/>
			)}
			<ThresholdAmountField
				label="Draw a line at"
				testIdPrefix="threshold"
				index={index}
				value={draft.value}
				onValueChange={setValue}
				unit={draft.unit}
				scopeUnit={scopeUnit}
				scopeLabel={`${showAxis ? draftAxis : 'y'}-axis unit`}
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
