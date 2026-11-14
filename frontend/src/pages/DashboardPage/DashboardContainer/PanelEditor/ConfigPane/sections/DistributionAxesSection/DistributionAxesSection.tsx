import { Callout } from '@signozhq/ui/callout';
import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';
import { DashboardtypesDistributionYScaleDTO } from 'api/generated/services/sigNoz.schemas';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigRangeInput from '../../controls/ConfigRangeInput/ConfigRangeInput';
import { isRangeInverted } from '../../controls/ConfigRangeInput/utils';
import ConfigTiles from '../../controls/ConfigTiles/ConfigTiles';
import { createFieldResetter } from '../../utils/changes';
import { Y_SCALE_HELP, Y_SCALE_OPTIONS } from './options';

import styles from './DistributionAxesSection.module.scss';

function DistributionAxesSection({
	value,
	savedValue,
	onChange,
}: SectionEditorProps<SectionKind.DistributionAxes>): JSX.Element {
	const reset = createFieldResetter(value, savedValue, onChange);
	const xMin = value?.x?.min;
	const xMax = value?.x?.max;
	const yScale = value?.y?.scale ?? DashboardtypesDistributionYScaleDTO.linear;

	return (
		<div className={styles.axes}>
			<div className={styles.axis}>
				<ConfigField
					label="X-axis range"
					help={
						isRangeInverted(xMin, xMax) ? (
							<Callout type="error" size="small" showIcon>
								Min can&apos;t be greater than max.
							</Callout>
						) : (
							'Hides buckets outside the range. Leave empty to show them all.'
						)
					}
					{...reset('x')}
				>
					<ConfigRangeInput
						minTestId="panel-editor-v2-distribution-x-min"
						maxTestId="panel-editor-v2-distribution-x-max"
						min={xMin}
						max={xMax}
						onChangeMin={(min): void =>
							onChange({ ...value, x: { ...value?.x, min } })
						}
						onChangeMax={(max): void =>
							onChange({ ...value, x: { ...value?.x, max } })
						}
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
