import { DashboardtypesHeatmapYScaleDTO } from 'api/generated/services/sigNoz.schemas';
import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigTiles from '../../controls/ConfigTiles/ConfigTiles';
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
 * linear/logarithmic scale toggle, or — for the heatmap, which has no soft bounds —
 * the bucket-axis distribution. Each control is gated by its `controls` flag.
 */
function AxesSection({
	value,
	savedValue,
	controls,
	onChange,
}: SectionEditorProps<SectionKind.Axes>): JSX.Element {
	const reset = createFieldResetter(value, savedValue, onChange);

	if (controls.y) {
		const scale = value?.y?.scale ?? DashboardtypesHeatmapYScaleDTO.auto;
		return (
			<ConfigField
				label="Y-axis scale"
				help={BUCKET_SCALE_HELP[scale]}
				{...reset('y')}
			>
				<ConfigTiles
					testId="panel-editor-v2-y-scale"
					aria-label="Y-axis scale"
					value={scale}
					items={BUCKET_SCALE_OPTIONS}
					onChange={(next): void =>
						onChange({ ...value, y: { ...value?.y, scale: next } })
					}
				/>
			</ConfigField>
		);
	}

	return (
		<ConfigField label="Y axis" {...reset('softMin', 'softMax', 'isLogScale')}>
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
			</AxisFields>
		</ConfigField>
	);
}

export default AxesSection;
