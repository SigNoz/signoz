import {
	DashboardtypesDistributionXScaleDTO,
	DashboardtypesDistributionYScaleDTO,
} from 'api/generated/services/sigNoz.schemas';
import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigTiles from '../../controls/ConfigTiles/ConfigTiles';
import { createFieldResetter } from '../../utils/changes';
import {
	X_SCALE_HELP,
	X_SCALE_OPTIONS,
	Y_SCALE_HELP,
	Y_SCALE_OPTIONS,
} from './options';

import styles from './DistributionAxesSection.module.scss';

function DistributionAxesSection({
	value,
	savedValue,
	onChange,
}: SectionEditorProps<SectionKind.DistributionAxes>): JSX.Element {
	const reset = createFieldResetter(value, savedValue, onChange);
	const xScale = value?.x?.scale ?? DashboardtypesDistributionXScaleDTO.auto;
	const yScale = value?.y?.scale ?? DashboardtypesDistributionYScaleDTO.linear;

	return (
		<div className={styles.axes}>
			<div className={styles.axis}>
				<ConfigField
					label="X-axis scale"
					help={X_SCALE_HELP[xScale]}
					{...reset('x')}
				>
					<ConfigTiles
						testId="panel-editor-v2-distribution-x-scale"
						aria-label="X-axis scale"
						value={xScale}
						items={X_SCALE_OPTIONS}
						onChange={(scale): void => onChange({ ...value, x: { scale } })}
					/>
				</ConfigField>
			</div>
			<div className={styles.axis}>
				<ConfigField
					label="Y-axis scale"
					help={Y_SCALE_HELP[yScale]}
					{...reset('y')}
				>
					<ConfigTiles
						testId="panel-editor-v2-distribution-y-scale"
						aria-label="Y-axis scale"
						value={yScale}
						items={Y_SCALE_OPTIONS}
						onChange={(scale): void => onChange({ ...value, y: { scale } })}
					/>
				</ConfigField>
			</div>
		</div>
	);
}

export default DistributionAxesSection;
