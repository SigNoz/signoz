import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigFieldRow from '../../controls/ConfigFieldRow/ConfigFieldRow';
import ConfigNumberInput from '../../controls/ConfigNumberInput/ConfigNumberInput';
import ConfigSwitch from '../../controls/ConfigSwitch/ConfigSwitch';
import { SWITCH_SKETCHES } from '../../controls/drawings/switchSketches';
import { createFieldResetter } from '../../utils/changes';

/**
 * Edits the `histogramBuckets` slice of a Histogram panel spec: bucket count / width
 * and whether to merge all active queries into one set of buckets. Each control is gated
 * by its `controls` flag.
 */
function BucketsSection({
	value,
	defaultValue,
	controls,
	onChange,
}: SectionEditorProps<SectionKind.Buckets>): JSX.Element {
	const reset = createFieldResetter(value, defaultValue, onChange);

	return (
		<>
			{(controls.count || controls.width) && (
				<ConfigField
					label="Buckets"
					help="How values are grouped into bars. Leave on Auto to size buckets from the data."
					{...reset('bucketCount', 'bucketWidth')}
				>
					<ConfigFieldRow>
						{controls.count && (
							<ConfigNumberInput
								testId="panel-editor-v2-bucket-count"
								label="Count"
								value={value?.bucketCount}
								onChange={(bucketCount): void => onChange({ ...value, bucketCount })}
							/>
						)}
						{controls.width && (
							<ConfigNumberInput
								testId="panel-editor-v2-bucket-width"
								label="Width"
								value={value?.bucketWidth}
								onChange={(bucketWidth): void => onChange({ ...value, bucketWidth })}
							/>
						)}
					</ConfigFieldRow>
				</ConfigField>
			)}

			{controls.mergeQueries && (
				<ConfigSwitch
					testId="panel-editor-v2-merge-queries"
					title="Combine queries"
					description="Puts every active query into one distribution. Hides the legend."
					sketch={SWITCH_SKETCHES.combine}
					changed={reset('mergeAllActiveQueries').changed}
					value={value?.mergeAllActiveQueries ?? false}
					onChange={(mergeAllActiveQueries): void =>
						onChange({ ...value, mergeAllActiveQueries })
					}
				/>
			)}
		</>
	);
}

export default BucketsSection;
