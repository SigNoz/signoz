import { DashboardtypesHeatmapYScaleDTO } from 'api/generated/services/sigNoz.schemas';
import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigField from '../../controls/ConfigField/ConfigField';
import { createFieldResetter } from '../../utils/changes';
import AxisFields from './AxisFields';
import AxisRangeField from './AxisRangeField';
import AxisScaleField from './AxisScaleField';
import {
	BUCKET_SCALE_HELP,
	BUCKET_SCALE_OPTIONS,
	LOG_SCALE_OPTIONS,
	SCALE_HELP,
} from './options';

/**
 * Edits the `axes` slice of a panel spec: soft Y-axis min/max bounds, the
 * linear/logarithmic scale toggle, and the heatmap's bucket-axis distribution.
 * Each control is gated by its `controls` flag.
 */
function AxesSection({
	value,
	defaultValue,
	controls,
	onChange,
}: SectionEditorProps<SectionKind.Axes>): JSX.Element {
	const reset = createFieldResetter(value, defaultValue, onChange);

	return (
		<ConfigField
			label="Y axis"
			{...reset('softMin', 'softMax', 'isLogScale', 'y')}
		>
			<AxisFields>
				{controls.minMax && (
					<AxisRangeField
						testIdPrefix="panel-editor-v2"
						value={value}
						onChange={(bounds): void => onChange({ ...value, ...bounds })}
					/>
				)}

				{controls.logScale && (
					<AxisScaleField
						testId="panel-editor-v2-log-scale"
						aria-label="Y-axis scale"
						value={value?.isLogScale ? 'log' : 'linear'}
						items={LOG_SCALE_OPTIONS}
						help={SCALE_HELP}
						onChange={(next): void =>
							onChange({ ...value, isLogScale: next === 'log' })
						}
					/>
				)}

				{controls.y && (
					<AxisScaleField
						testId="panel-editor-v2-y-scale"
						aria-label="Y-axis scale"
						value={value?.y?.scale ?? DashboardtypesHeatmapYScaleDTO.auto}
						items={BUCKET_SCALE_OPTIONS}
						help={BUCKET_SCALE_HELP}
						onChange={(next): void =>
							onChange({ ...value, y: { ...value?.y, scale: next } })
						}
					/>
				)}
			</AxisFields>
		</ConfigField>
	);
}

export default AxesSection;
