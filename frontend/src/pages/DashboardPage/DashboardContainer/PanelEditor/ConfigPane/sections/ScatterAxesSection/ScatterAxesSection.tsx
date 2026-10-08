import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigField from '../../controls/ConfigField/ConfigField';
import type { SectionEditorContext } from '../../sectionContext';
import { createFieldResetter } from '../../utils/changes';
import ScatterAxisFields from './ScatterAxisFields';

import styles from './ScatterAxesSection.module.scss';

type ScatterAxesSectionProps = SectionEditorProps<SectionKind.ScatterAxes> &
	Pick<SectionEditorContext, 'axisColumnNames'>;

/** Edits a Scatter Plot's `axes` slice: label, soft bounds and scale, per axis. */
function ScatterAxesSection({
	value,
	savedValue,
	onChange,
	axisColumnNames,
}: ScatterAxesSectionProps): JSX.Element {
	const reset = createFieldResetter(value, savedValue, onChange);

	return (
		<div className={styles.axes}>
			{(['x', 'y'] as const).map((axis) => (
				<div key={axis} className={styles.axis}>
					<ConfigField label={`${axis.toUpperCase()} axis`} {...reset(axis)}>
						<ScatterAxisFields
							axis={axis}
							value={value?.[axis]}
							columnName={axisColumnNames?.[axis]}
							onChange={(next): void => onChange({ ...value, [axis]: next })}
						/>
					</ConfigField>
				</div>
			))}
		</div>
	);
}

export default ScatterAxesSection;
