import { Input } from 'antd';
import {
	DashboardtypesAxisScaleDTO,
	type DashboardtypesScatterPlotAxisDTO,
} from 'api/generated/services/sigNoz.schemas';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigInlineField from '../../controls/ConfigInlineField/ConfigInlineField';
import ConfigRangeInput from '../../controls/ConfigRangeInput/ConfigRangeInput';
import ConfigTiles from '../../controls/ConfigTiles/ConfigTiles';
import { RANGE_HELP } from '../AxesSection/options';
import { LOG_RANGE_IGNORED_HELP, SCALE_HELP, SCALE_OPTIONS } from './options';
import { hasBoundALogAxisDrops } from './utils';

import styles from './ScatterAxesSection.module.scss';

interface ScatterAxisFieldsProps {
	axis: 'x' | 'y';
	value: DashboardtypesScatterPlotAxisDTO | undefined;
	onChange: (next: DashboardtypesScatterPlotAxisDTO) => void;
	/** The name of the column the axis plots, shown until a label is typed. */
	columnName?: string;
}

function ScatterAxisFields({
	axis,
	value,
	onChange,
	columnName,
}: ScatterAxisFieldsProps): JSX.Element {
	const scale = value?.scale ?? DashboardtypesAxisScaleDTO.auto;
	const name = axis.toUpperCase();

	return (
		<div className={styles.fields}>
			<ConfigInlineField label="Label">
				<Input
					data-testid={`panel-editor-v2-${axis}-label`}
					aria-label={`${name}-axis label`}
					placeholder={columnName ?? 'None'}
					value={value?.label ?? ''}
					onChange={(event): void =>
						onChange({ ...value, label: event.target.value })
					}
				/>
			</ConfigInlineField>
			<ConfigInlineField
				label="Range"
				help={
					hasBoundALogAxisDrops(scale, value) ? LOG_RANGE_IGNORED_HELP : RANGE_HELP
				}
				helpTestId={`panel-editor-v2-${axis}-range-help`}
			>
				<ConfigRangeInput
					minTestId={`panel-editor-v2-${axis}-soft-min`}
					maxTestId={`panel-editor-v2-${axis}-soft-max`}
					min={value?.softMin}
					max={value?.softMax}
					onChangeMin={(softMin): void => onChange({ ...value, softMin })}
					onChangeMax={(softMax): void => onChange({ ...value, softMax })}
				/>
			</ConfigInlineField>
			<ConfigField label="Scale" help={SCALE_HELP[scale]}>
				<ConfigTiles
					testId={`panel-editor-v2-${axis}-scale`}
					aria-label={`${name}-axis scale`}
					value={scale}
					items={SCALE_OPTIONS}
					onChange={(next): void => onChange({ ...value, scale: next })}
				/>
			</ConfigField>
		</div>
	);
}

export default ScatterAxisFields;
